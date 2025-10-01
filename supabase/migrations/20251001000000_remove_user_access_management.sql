-- Remove User & Access Management System
-- This migration removes organizations, teams, and custom roles functionality

-- 1. Drop dependent foreign keys first
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_organization_id_fkey;
ALTER TABLE public.webhooks DROP CONSTRAINT IF EXISTS webhooks_organization_id_fkey;

-- 2. Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.team_memberships CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.custom_roles CASCADE;
DROP TABLE IF EXISTS public.organization_memberships CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_interests CASCADE;

-- 3. Revert profile enhancements (optional - keep if still useful)
-- Uncomment the following lines if you want to remove the enhanced profile fields
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS timezone;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferences;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS social_links;

-- 4. Update api_keys and webhooks to remove organization dependency
-- Make organization_id nullable or remove if not needed
ALTER TABLE public.api_keys ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.webhooks ALTER COLUMN organization_id DROP NOT NULL;

-- 5. Clean up any remaining references
-- Add any additional cleanup as needed based on your schema
