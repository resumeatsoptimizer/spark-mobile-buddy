-- สคริปท์ SQL สำหรับตรวจสอบระบบ email logs
-- รันใน Supabase SQL Editor หรือ psql

-- 1. ตรวจสอบว่ามีตาราง email_logs หรือไม่
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'email_logs'
) as table_exists;

-- 2. ดูโครงสร้างตาราง email_logs
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'email_logs'
ORDER BY ordinal_position;

-- 3. นับจำนวน email logs ทั้งหมด
SELECT
  COUNT(*) as total_logs,
  COUNT(DISTINCT email_type) as distinct_types,
  COUNT(DISTINCT status) as distinct_statuses
FROM public.email_logs;

-- 4. ดูสถิติการส่งอีเมลแยกตามประเภท
SELECT
  email_type,
  status,
  COUNT(*) as count,
  MIN(created_at) as first_sent,
  MAX(created_at) as last_sent
FROM public.email_logs
GROUP BY email_type, status
ORDER BY email_type, status;

-- 5. ดู email logs ล่าสุด 20 รายการ
SELECT
  id,
  email_type,
  recipient_email,
  status,
  sent_at,
  error_message,
  created_at
FROM public.email_logs
ORDER BY created_at DESC
LIMIT 20;

-- 6. ตรวจสอบ email ที่ส่งไม่สำเร็จ
SELECT
  id,
  email_type,
  recipient_email,
  status,
  error_message,
  created_at
FROM public.email_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- 7. ตรวจสอบ email ที่ยังรอส่ง (pending)
SELECT
  id,
  email_type,
  recipient_email,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
FROM public.email_logs
WHERE status = 'pending'
ORDER BY created_at ASC;

-- 8. ดูสถิติการส่งอีเมลในแต่ละวัน (7 วันล่าสุด)
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM public.email_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 9. ตรวจสอบ email logs สำหรับ event ที่มีการลงทะเบียนล่าสุด
SELECT
  el.email_type,
  el.recipient_email,
  el.status,
  el.sent_at,
  e.title as event_title,
  r.status as registration_status
FROM public.email_logs el
LEFT JOIN public.registrations r ON el.registration_id = r.id
LEFT JOIN public.events e ON el.event_id = e.id
ORDER BY el.created_at DESC
LIMIT 10;

-- 10. ตรวจสอบอีเมลที่ส่งซ้ำ (duplicate emails)
SELECT
  registration_id,
  email_type,
  recipient_email,
  COUNT(*) as send_count,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM public.email_logs
GROUP BY registration_id, email_type, recipient_email
HAVING COUNT(*) > 1
ORDER BY send_count DESC;

-- 11. ตรวจสอบ RLS policies สำหรับ email_logs
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
WHERE tablename = 'email_logs';

-- 12. ทดสอบ insert email log (comment ออกถ้าไม่ต้องการทดสอบ)
/*
INSERT INTO public.email_logs (
  recipient_email,
  email_type,
  status,
  sent_at
) VALUES (
  'test@example.com',
  'confirmation',
  'sent',
  NOW()
) RETURNING *;
*/
