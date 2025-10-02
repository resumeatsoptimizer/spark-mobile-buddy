-- Backfill missing profiles from auth.users
INSERT INTO public.profiles (id, email, name)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.email
  )
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Create function to ensure profile exists for user
CREATE OR REPLACE FUNCTION public.ensure_user_profile(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    -- Get user data from auth.users
    SELECT email, COALESCE(raw_user_meta_data->>'name', email)
    INTO user_email, user_name
    FROM auth.users
    WHERE id = p_user_id;
    
    -- Create profile if user exists
    IF user_email IS NOT NULL THEN
      INSERT INTO public.profiles (id, email, name)
      VALUES (p_user_id, user_email, user_name)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END;
$$;