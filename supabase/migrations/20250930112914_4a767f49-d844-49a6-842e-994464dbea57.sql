-- Add location and google_map_url columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS google_map_url text;