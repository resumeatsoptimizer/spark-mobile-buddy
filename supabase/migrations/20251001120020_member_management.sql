-- ============================================
-- MEMBER MANAGEMENT SYSTEM
-- Created: 2025-10-01
-- Purpose: Tables and functions for comprehensive member management
-- ============================================

-- ============================================
-- 1. MEMBER STATUS ENUM
-- ============================================

CREATE TYPE public.member_status AS ENUM ('active', 'inactive', 'suspended', 'blocked');

-- Add status column to profiles if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status public.member_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.status IS 'Member account status';
COMMENT ON COLUMN public.profiles.last_login_at IS 'Last time user logged in';

-- ============================================
-- 2. MEMBER TAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.member_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#3b82f6',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_member_tags_user_id ON public.member_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_tag_name ON public.member_tags(tag_name);

ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_tags IS 'Tags for member segmentation and organization';

-- ============================================
-- 3. MEMBER NOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_notes_user_id ON public.member_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_member_notes_created_at ON public.member_notes(created_at DESC);

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_notes IS 'Admin notes about members';

-- ============================================
-- 4. MEMBER STATUS HISTORY TABLE (Audit Log)
-- ============================================

CREATE TABLE IF NOT EXISTS public.member_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_status public.member_status,
  new_status public.member_status NOT NULL,
  reason TEXT,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_status_history_user_id ON public.member_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_member_status_history_changed_at ON public.member_status_history(changed_at DESC);

ALTER TABLE public.member_status_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_status_history IS 'Audit log for member status changes';

-- ============================================
-- 5. MEMBER SEGMENTS TABLE (Saved Filters)
-- ============================================

CREATE TABLE IF NOT EXISTS public.member_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_name TEXT NOT NULL,
  segment_description TEXT,
  filter_config JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_segments_created_by ON public.member_segments(created_by);

ALTER TABLE public.member_segments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_segments IS 'Saved member filter configurations';

-- ============================================
-- 6. ADD TRIGGERS
-- ============================================

-- Update updated_at for member_notes
CREATE TRIGGER update_member_notes_updated_at
  BEFORE UPDATE ON public.member_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update updated_at for member_segments
CREATE TRIGGER update_member_segments_updated_at
  BEFORE UPDATE ON public.member_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.trigger_log_member_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.member_status_history (
      user_id,
      old_status,
      new_status,
      changed_by
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_profile_status_change
  AFTER UPDATE OF status
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_member_status_change();

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Get member full details with aggregated data
CREATE OR REPLACE FUNCTION public.get_member_details(member_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  line_id TEXT,
  avatar_url TEXT,
  bio TEXT,
  status public.member_status,
  account_verified BOOLEAN,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_registrations BIGINT,
  total_events_attended BIGINT,
  total_payments BIGINT,
  total_amount_paid DECIMAL,
  engagement_score DECIMAL,
  tags JSONB,
  roles JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.name,
    p.phone,
    p.line_id,
    p.avatar_url,
    p.bio,
    p.status,
    p.account_verified,
    p.last_login_at,
    p.created_at,

    -- Aggregated stats
    COALESCE(COUNT(DISTINCT r.id), 0) as total_registrations,
    COALESCE(COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed'), 0) as total_events_attended,
    COALESCE(COUNT(DISTINCT pm.id), 0) as total_payments,
    COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'success'), 0) as total_amount_paid,

    -- Engagement score (simplified)
    COALESCE(
      (COUNT(DISTINCT r.id) * 10 +
       COUNT(DISTINCT pm.id) * 5 +
       CASE WHEN p.last_login_at > now() - interval '7 days' THEN 20 ELSE 0 END)::DECIMAL,
      0
    ) as engagement_score,

    -- Tags as JSONB
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object(
        'name', mt.tag_name,
        'color', mt.tag_color
      )) FILTER (WHERE mt.id IS NOT NULL),
      '[]'::jsonb
    ) as tags,

    -- Roles as JSONB
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(ur.role)) FILTER (WHERE ur.id IS NOT NULL),
      '[]'::jsonb
    ) as roles

  FROM public.profiles p
  LEFT JOIN public.registrations r ON r.user_id = p.id
  LEFT JOIN public.payments pm ON pm.registration_id = r.id
  LEFT JOIN public.member_tags mt ON mt.user_id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = member_id
  GROUP BY p.id;
END;
$$;

COMMENT ON FUNCTION public.get_member_details IS 'Get comprehensive member details with aggregated statistics';

-- Update member status with audit log
CREATE OR REPLACE FUNCTION public.update_member_status(
  p_user_id UUID,
  p_new_status public.member_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status public.member_status;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Update status
  UPDATE public.profiles
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_user_id;

  -- Log to history (trigger will handle this, but we can add manual reason)
  IF p_reason IS NOT NULL THEN
    UPDATE public.member_status_history
    SET reason = p_reason
    WHERE user_id = p_user_id
      AND changed_at = (
        SELECT MAX(changed_at)
        FROM public.member_status_history
        WHERE user_id = p_user_id
      );
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.update_member_status IS 'Update member status with automatic audit logging';

-- Get member statistics
CREATE OR REPLACE FUNCTION public.get_member_statistics(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  inactive_members BIGINT,
  suspended_members BIGINT,
  blocked_members BIGINT,
  new_members_this_month BIGINT,
  verified_accounts BIGINT,
  avg_engagement_score DECIMAL,
  total_registrations BIGINT,
  total_revenue DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_members,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT as inactive_members,
    COUNT(*) FILTER (WHERE status = 'suspended')::BIGINT as suspended_members,
    COUNT(*) FILTER (WHERE status = 'blocked')::BIGINT as blocked_members,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::BIGINT as new_members_this_month,
    COUNT(*) FILTER (WHERE account_verified = true)::BIGINT as verified_accounts,
    0::DECIMAL as avg_engagement_score, -- Placeholder
    0::BIGINT as total_registrations,   -- Placeholder
    0::DECIMAL as total_revenue          -- Placeholder
  FROM public.profiles
  WHERE (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date);
END;
$$;

COMMENT ON FUNCTION public.get_member_statistics IS 'Get member statistics for a given date range';

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- member_tags policies
CREATE POLICY "Admins and staff can view all tags"
  ON public.member_tags FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can manage tags"
  ON public.member_tags FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

-- member_notes policies
CREATE POLICY "Admins and staff can view all notes"
  ON public.member_notes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can manage notes"
  ON public.member_notes FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

-- member_status_history policies
CREATE POLICY "Admins and staff can view status history"
  ON public.member_status_history FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

-- member_segments policies
CREATE POLICY "Users can view their own segments or public segments"
  ON public.member_segments FOR SELECT
  USING (
    created_by = auth.uid() OR
    is_public = true OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can manage their own segments"
  ON public.member_segments FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all segments"
  ON public.member_segments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.member_tags TO authenticated;
GRANT SELECT ON public.member_notes TO authenticated;
GRANT SELECT ON public.member_status_history TO authenticated;
GRANT SELECT ON public.member_segments TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_member_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_status(UUID, public.member_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_statistics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================
-- 10. CREATE MATERIALIZED VIEW FOR MEMBER STATS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_member_statistics AS
SELECT
  p.id as user_id,
  p.email,
  p.name,
  p.status,
  p.created_at,
  p.last_login_at,

  -- Registration stats
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') as cancelled_registrations,

  -- Payment stats
  COUNT(DISTINCT pm.id) as total_payments,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'success'), 0) as total_amount_paid,
  COALESCE(AVG(pm.amount) FILTER (WHERE pm.status = 'success'), 0) as avg_payment_amount,

  -- Engagement metrics
  MAX(r.created_at) as last_registration_date,
  CASE
    WHEN p.last_login_at > now() - interval '7 days' THEN 'highly_active'
    WHEN p.last_login_at > now() - interval '30 days' THEN 'active'
    WHEN p.last_login_at > now() - interval '90 days' THEN 'moderate'
    ELSE 'inactive'
  END as activity_level,

  -- Tags count
  COUNT(DISTINCT mt.id) as tags_count

FROM public.profiles p
LEFT JOIN public.registrations r ON r.user_id = p.id
LEFT JOIN public.payments pm ON pm.registration_id = r.id
LEFT JOIN public.member_tags mt ON mt.user_id = p.id
GROUP BY p.id, p.email, p.name, p.status, p.created_at, p.last_login_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_member_statistics_user_id
  ON public.mv_member_statistics(user_id);

CREATE INDEX IF NOT EXISTS idx_mv_member_statistics_status
  ON public.mv_member_statistics(status);

CREATE INDEX IF NOT EXISTS idx_mv_member_statistics_activity_level
  ON public.mv_member_statistics(activity_level);

COMMENT ON MATERIALIZED VIEW public.mv_member_statistics IS
  'Aggregated member statistics for quick dashboard queries';

-- ============================================
-- 11. REFRESH FUNCTION FOR MEMBER STATS
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_member_statistics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
END;
$$;

COMMENT ON FUNCTION public.refresh_member_statistics IS
  'Refresh member statistics materialized view';

-- ============================================
-- Verification Queries
-- ============================================

-- Check tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'member%';

-- Check member statistics
-- SELECT * FROM public.get_member_statistics();

-- Check materialized view
-- SELECT * FROM public.mv_member_statistics LIMIT 10;
