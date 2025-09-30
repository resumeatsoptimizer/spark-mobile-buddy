-- Add column for storing Google Maps iframe embed code
ALTER TABLE public.events
ADD COLUMN google_map_embed_code TEXT;