-- Add ticket_type_id to registrations table
ALTER TABLE public.registrations 
ADD COLUMN ticket_type_id uuid REFERENCES public.ticket_types(id);

-- Add index for better query performance
CREATE INDEX idx_registrations_ticket_type_id ON public.registrations(ticket_type_id);