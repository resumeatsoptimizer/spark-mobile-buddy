-- Add new columns to events table for advanced features
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_open_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS registration_close_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS allow_overbooking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS overbooking_percentage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS waitlist_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS max_waitlist_size integer,
ADD COLUMN IF NOT EXISTS auto_promote_rule text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS promote_window_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS invitation_code text;

-- Create ticket_types table for managing multiple ticket types per event
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  seats_allocated integer NOT NULL,
  seats_remaining integer NOT NULL,
  price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on ticket_types
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_types
CREATE POLICY "Anyone can view ticket types"
ON public.ticket_types
FOR SELECT
USING (true);

CREATE POLICY "Admins and staff can manage ticket types"
ON public.ticket_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Add trigger for updated_at on ticket_types
CREATE TRIGGER update_ticket_types_updated_at
BEFORE UPDATE ON public.ticket_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();