-- Drop existing materialized view and recreate with all needed columns
DROP MATERIALIZED VIEW IF EXISTS public.mv_member_statistics CASCADE;

CREATE MATERIALIZED VIEW public.mv_member_statistics AS
SELECT 
  p.id as user_id,
  p.email,
  p.name,
  COALESCE(
    CASE 
      WHEN COUNT(r.id) >= 10 THEN 'high'
      WHEN COUNT(r.id) >= 5 THEN 'medium'
      WHEN COUNT(r.id) > 0 THEN 'low'
      ELSE 'inactive'
    END,
    'inactive'
  ) as activity_level,
  COALESCE(
    CASE 
      WHEN COUNT(r.id) >= 10 THEN 85
      WHEN COUNT(r.id) >= 5 THEN 60
      WHEN COUNT(r.id) > 0 THEN 35
      ELSE 0
    END,
    0
  ) as engagement_score,
  COALESCE(
    CASE 
      WHEN MAX(r.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
      WHEN MAX(r.created_at) > NOW() - INTERVAL '90 days' THEN 'inactive'
      WHEN MAX(r.created_at) IS NOT NULL THEN 'dormant'
      ELSE 'new'
    END,
    'new'
  ) as status,
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.event_id END) as total_events_attended,
  COALESCE(SUM(pay.amount), 0) as total_amount_paid,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'completed') as total_payments,
  p.created_at,
  MAX(r.created_at) as last_registration_at,
  MAX(ae.created_at) FILTER (WHERE ae.event_type = 'user_login') as last_login_at
FROM public.profiles p
LEFT JOIN public.registrations r ON r.user_id = p.id
LEFT JOIN public.payments pay ON pay.registration_id = r.id AND pay.status = 'completed'
LEFT JOIN public.analytics_events ae ON ae.user_id = p.id AND ae.event_type = 'user_login'
GROUP BY p.id, p.email, p.name, p.created_at;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX mv_member_statistics_user_id_idx ON public.mv_member_statistics(user_id);

-- Update get_member_details function to return comprehensive data
CREATE OR REPLACE FUNCTION public.get_member_details(member_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  user_tags TEXT[];
  user_roles TEXT[];
BEGIN
  -- Get tags for the user
  SELECT ARRAY_AGG(tag) INTO user_tags
  FROM public.member_tags
  WHERE user_id = member_id;
  
  -- Get roles for the user
  SELECT ARRAY_AGG(role::text) INTO user_roles
  FROM public.user_roles
  WHERE user_id = member_id;
  
  -- Build comprehensive member details
  SELECT json_build_object(
    'user_id', ms.user_id,
    'email', ms.email,
    'name', ms.name,
    'status', ms.status,
    'activity_level', ms.activity_level,
    'engagement_score', ms.engagement_score,
    'total_registrations', ms.total_registrations,
    'total_events_attended', ms.total_events_attended,
    'total_amount_paid', ms.total_amount_paid,
    'total_payments', ms.total_payments,
    'created_at', ms.created_at,
    'last_registration_at', ms.last_registration_at,
    'last_login_at', ms.last_login_at,
    'tags', COALESCE(user_tags, ARRAY[]::TEXT[]),
    'roles', COALESCE(user_roles, ARRAY[]::TEXT[])
  )
  INTO result
  FROM public.mv_member_statistics ms
  WHERE ms.user_id = member_id;
  
  RETURN result;
END;
$function$;

-- Create function to track user logins via analytics_events
CREATE OR REPLACE FUNCTION public.track_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_category,
    event_data
  )
  VALUES (
    NEW.id,
    'user_login',
    'authentication',
    jsonb_build_object(
      'login_time', NOW(),
      'auth_method', COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
    )
  );
  RETURN NEW;
END;
$function$;

-- Create trigger on auth.users for login tracking (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_login_track'
  ) THEN
    CREATE TRIGGER on_user_login_track
      AFTER UPDATE ON auth.users
      FOR EACH ROW
      WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
      EXECUTE FUNCTION public.track_user_login();
  END IF;
END $$;