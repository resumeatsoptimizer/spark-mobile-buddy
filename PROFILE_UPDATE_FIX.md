# แก้ไขปัญหา "ไม่สามารถอัพเดทโปรไฟล์ได้"

## ปัญหาที่พบ
ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้หลังจากแก้ไข

## สาเหตุที่เป็นไปได้

### 1. Migration ยังไม่ได้รัน
ฟิลด์ `line_id` อาจยังไม่มีในฐานข้อมูล

### 2. RLS Policies ไม่ถูกต้อง
Policies อาจไม่มี WITH CHECK clause

### 3. Permissions ไม่เพียงพอ
User อาจไม่มีสิทธิ์ UPDATE ตาราง profiles

## วิธีแก้ไข

### ขั้นตอนที่ 1: รัน Migrations ทั้งหมด

```bash
# เข้าไปที่ Supabase Dashboard
# https://supabase.com/dashboard/project/YOUR_PROJECT_ID

# หรือใช้ Supabase CLI
supabase db reset
```

**Migrations ที่ต้องรัน:**
1. `20251001000001_add_line_id_to_profiles.sql` - เพิ่ม line_id field
2. `20251001000002_create_avatars_bucket.sql` - สร้าง avatars storage bucket
3. `20251001000003_fix_profiles_rls_policy.sql` - แก้ไข RLS policies

### ขั้นตอนที่ 2: ตรวจสอบ Console

เปิด Browser Console (F12) และดูข้อความ error:
- ถ้าเห็น "column line_id does not exist" → รัน migration 1
- ถ้าเห็น "permission denied" → รัน migration 3
- ถ้าเห็น "new row violates row-level security policy" → ตรวจสอบ RLS policies

### ขั้นตอนที่ 3: ตรวจสอบในฐานข้อมูล

ใน Supabase SQL Editor ให้รัน:

```sql
-- ตรวจสอบว่ามี column line_id หรือไม่
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'line_id';

-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'profiles';

-- ตรวจสอบ permissions
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'profiles'
AND grantee = 'authenticated';
```

### ขั้นตอนที่ 4: Manual Fix (ถ้าจำเป็น)

ถ้า migrations ไม่ได้รัน ให้รัน SQL ด้านล่างใน Supabase SQL Editor:

```sql
-- 1. เพิ่ม line_id column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS line_id TEXT;

-- 2. แก้ไข RLS policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Grant permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
```

## การ Debug

โค้ดได้เพิ่ม error logging แล้ว ดูได้จาก Console:

```javascript
console.error("Profile update error:", error);
```

ข้อความ error จะบอกสาเหตุที่แน่ชัด

## Testing

หลังจากแก้ไขแล้ว ให้ทดสอบ:

1. ✅ เปิดหน้า Profile
2. ✅ กดปุ่ม "แก้ไขโปรไฟล์"
3. ✅ เปลี่ยนข้อมูล (ชื่อ, เบอร์, Line ID, etc.)
4. ✅ กดปุ่ม "บันทึกข้อมูล"
5. ✅ ตรวจสอบว่าแสดงข้อความ "บันทึกสำเร็จ"
6. ✅ Refresh หน้าและตรวจสอบว่าข้อมูลถูกบันทึก

## ติดต่อ

หากยังมีปัญหา ให้ส่ง:
- Screenshot ของ error message
- Console logs (F12 → Console tab)
- ข้อมูลจากการรัน SQL queries ด้านบน
