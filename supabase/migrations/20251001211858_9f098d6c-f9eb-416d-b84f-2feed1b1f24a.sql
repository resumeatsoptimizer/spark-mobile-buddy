-- Allow users to update their own registration status for cancellation
CREATE POLICY "Users can cancel their own registrations"
ON public.registrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status IN ('cancelled', 'pending', 'confirmed', 'waitlist'));