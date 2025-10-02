-- Fix search_path for get_member_details function
CREATE OR REPLACE FUNCTION public.get_member_details(member_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path for track_user_login function
CREATE OR REPLACE FUNCTION public.track_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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