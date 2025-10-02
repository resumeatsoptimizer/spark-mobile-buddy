-- Fix profiles RLS policy to allow admin and staff to view all profiles
-- This is needed for the admin registrations page to show user names and emails

-- Add policy for admins and staff to view all profiles
CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );
