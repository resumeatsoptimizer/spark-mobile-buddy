-- Fix foreign key constraint to allow user deletion
-- Change event_check_ins.checked_in_by to CASCADE deletion

ALTER TABLE public.event_check_ins
DROP CONSTRAINT IF EXISTS event_check_ins_checked_in_by_fkey;

ALTER TABLE public.event_check_ins
ADD CONSTRAINT event_check_ins_checked_in_by_fkey
FOREIGN KEY (checked_in_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;