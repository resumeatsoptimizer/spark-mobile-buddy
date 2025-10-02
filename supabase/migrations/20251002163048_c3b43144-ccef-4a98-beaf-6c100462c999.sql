-- Fix profiles RLS policy to allow admin and staff to view all profiles
-- This is needed for the admin registrations page to show user names and emails

CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'staff'::app_role)
  );