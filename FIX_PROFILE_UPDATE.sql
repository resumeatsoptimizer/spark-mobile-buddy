-- ============================================
-- FIX PROFILE UPDATE ISSUE
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Add missing columns to profiles table
-- (These might already exist from previous migrations)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS line_id TEXT;

-- 2. Create index for line_id (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_line_id ON public.profiles(line_id);

-- 3. Fix RLS policies for profiles table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 5. Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you still get errors, check:
-- 1. User is authenticated: SELECT auth.uid();
-- 2. Profile exists: SELECT * FROM profiles WHERE id = auth.uid();
-- 3. Permissions: SELECT * FROM information_schema.table_privileges WHERE table_name = 'profiles';

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- After running this script:
-- - All required columns should exist
-- - RLS policies should allow authenticated users to update their own profile
-- - The profile page should work without errors
