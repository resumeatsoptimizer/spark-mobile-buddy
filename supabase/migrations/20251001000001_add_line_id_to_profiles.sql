-- Add LINE ID field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS line_id TEXT;

-- Add index for LINE ID lookup (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_line_id ON public.profiles(line_id);

-- Add comment
COMMENT ON COLUMN public.profiles.line_id IS 'LINE messaging app user ID';
