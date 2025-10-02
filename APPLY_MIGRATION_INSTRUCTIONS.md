# วิธีการ Apply Migration เพื่อแก้ไขปัญหาการแสดงผู้ลงทะเบียน

## ปัญหา
หน้า `/admin/registrations` คอลัมน์ "ผู้ลงทะเบียน" แสดง "ไม่ระบุ" แทนที่จะเป็นชื่อและอีเมลของ user

## สาเหตุ
RLS Policy ของตาราง `profiles` ไม่อนุญาตให้ admin/staff ดูข้อมูล profiles ของผู้อื่น

## วิธีแก้ไข

### วิธีที่ 1: ผ่าน Supabase Dashboard (แนะนำ)

1. เปิด Supabase Dashboard: https://supabase.com/dashboard/project/qhvxqmldpifwehnsrlyn
2. ไปที่เมนู **SQL Editor**
3. คลิก **New Query**
4. Copy SQL ด้านล่างนี้และวางลงใน Query Editor:

```sql
-- Fix profiles RLS policy to allow admin and staff to view all profiles
-- This is needed for the admin registrations page to show user names and emails

-- Add policy for admins and staff to view all profiles
CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );
```

5. คลิกปุ่ม **Run** (หรือกด `Ctrl+Enter`)
6. ตรวจสอบว่ามีข้อความ "Success" แสดงขึ้นมา

### วิธีที่ 2: ผ่าน Supabase CLI (สำหรับผู้ที่ติดตั้งและ login แล้ว)

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref qhvxqmldpifwehnsrlyn

# Push migrations
supabase db push
```

## การตรวจสอบผลลัพธ์

1. รีเฟรชหน้า `/admin/registrations`
2. ตรวจสอบว่าคอลัมน์ "ผู้ลงทะเบียน" แสดงชื่อและอีเมลของผู้ใช้แล้ว
3. ถ้ายังไม่แสดง ให้ลอง logout และ login ใหม่อีกครั้ง

## หมายเหตุ

Migration file นี้สร้างขึ้นที่: `supabase/migrations/20251002160000_fix_profiles_rls_for_admin.sql`
