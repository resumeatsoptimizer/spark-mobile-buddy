# รายงานการทดสอบระบบส่งอีเมล (Email System Test Report)

**วันที่:** 4 ตุลาคม 2568
**โปรเจกต์:** Spark Mobile Buddy - Event Management System
**ผู้ทดสอบ:** Claude Code

---

## 🔍 สรุปผลการตรวจสอบ

### ✅ สิ่งที่พบว่าทำงานได้ถูกต้อง

1. **โครงสร้างโค้ด**
   - ✅ มี Edge Function `send-registration-email` ที่ใช้ Resend API
   - ✅ HTML email templates ออกแบบดีและรองรับภาษาไทย
   - ✅ รองรับหลายประเภทอีเมล: registration, payment_success, status_update, cancellation, waitlist_promotion, payment_failed, payment_refunded
   - ✅ มี error handling และ logging ครบถ้วน
   - ✅ CORS headers ตั้งค่าถูกต้อง

2. **ฐานข้อมูล**
   - ✅ มีตาราง `email_logs` สำหรับบันทึกประวัติการส่งอีเมล
   - ✅ มี RLS policies ป้องกันการเข้าถึง (เฉพาะ admin/staff)
   - ✅ มี indexes สำหรับ performance
   - ✅ เก็บข้อมูล: email_type, status, error_message, sent_at

3. **การเชื่อมต่อระบบ**
   - ✅ ระบบเรียกใช้ send-registration-email จากหลายจุด:
     - การลงทะเบียน (EventRegistration.tsx:366)
     - การอัพเดทสถานะ (AdminRegistrations.tsx:187, 374)
     - การยกเลิก (Registrations.tsx:161)
     - Webhook การชำระเงิน (handle-omise-webhook)
     - การ refund (refund-omise-charge)
     - Scheduled tasks (scheduled-email-sender)
     - Waitlist promotion (auto-promote-waitlist)

4. **Configuration**
   - ✅ Function ตั้งค่า `verify_jwt = true` (ปลอดภัย)
   - ✅ รองรับการตั้งค่า FROM_EMAIL (default: workbrandai@gmail.com)

---

## ⚠️ สิ่งที่ต้องตรวจสอบเพิ่มเติม

### 1. **RESEND_API_KEY Configuration**
```bash
# ต้องตรวจสอบว่าตั้งค่าใน Supabase Secrets หรือยัง
npx supabase secrets list

# ถ้ายังไม่มี ต้องตั้งค่า:
npx supabase secrets set RESEND_API_KEY=re_xxxxx
```

**หมายเหตุ:** หากไม่ได้ตั้งค่า API key อีเมลจะส่งไม่ได้

### 2. **Function Deployment**
```bash
# ตรวจสอบว่า function deploy แล้วหรือยัง
npx supabase functions list

# Deploy function:
npx supabase functions deploy send-registration-email
```

### 3. **Database Migration**
```bash
# ตรวจสอบว่าตาราง email_logs มีอยู่หรือยัง
# รัน migration ถ้ายังไม่ได้รัน:
npx supabase db push
```

---

## 🧪 วิธีทดสอบระบบ

### ขั้นตอนที่ 1: ทดสอบ Email Template
1. เปิดไฟล์ `test-email-template.html` ในเบราว์เซอร์
2. ตรวจสอบว่า layout และ styling ถูกต้อง
3. ตรวจสอบการแสดงผลภาษาไทย

### ขั้นตอนที่ 2: ทดสอบ Edge Function (ผ่าน TypeScript)
```bash
# ติดตั้ง dependencies
npm install tsx @supabase/supabase-js

# แก้ไข recipientEmail ใน test-email-function.ts
# เปลี่ยนจาก 'test@example.com' เป็นอีเมลจริง

# รันสคริปท์ทดสอบ
npx tsx test-email-function.ts
```

### ขั้นตอนที่ 3: ตรวจสอบ Email Logs (ผ่าน SQL)
```bash
# เข้า Supabase SQL Editor
# Copy queries จาก test-email-logs.sql
# รันทีละ query เพื่อดูสถิติ
```

### ขั้นตอนที่ 4: ทดสอบจริงผ่าน UI
1. เข้าสู่ระบบในแอป
2. ลงทะเบียนเข้าร่วม event
3. ตรวจสอบอีเมลที่ได้รับ
4. ตรวจสอบ email_logs ในฐานข้อมูล

---

## 📊 การตรวจสอบ Email Logs

### Query สำคัญ:

**1. ดูสถิติการส่งอีเมล:**
```sql
SELECT
  email_type,
  status,
  COUNT(*) as count
FROM email_logs
GROUP BY email_type, status;
```

**2. ดูอีเมลที่ส่งไม่สำเร็จ:**
```sql
SELECT * FROM email_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**3. ดูอีเมลล่าสุด:**
```sql
SELECT * FROM email_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔧 การแก้ไขปัญหาที่พบบ่อย

### ปัญหา: อีเมลไม่ถูกส่ง
**สาเหตุที่เป็นไปได้:**
- ❌ RESEND_API_KEY ไม่ได้ตั้งค่า
- ❌ API key หมดอายุหรือไม่ถูกต้อง
- ❌ FROM_EMAIL ไม่ได้ verify กับ Resend
- ❌ Function ไม่ได้ deploy

**วิธีแก้:**
```bash
# 1. ตั้งค่า API key
npx supabase secrets set RESEND_API_KEY=<your-key>

# 2. Deploy function อีกครั้ง
npx supabase functions deploy send-registration-email

# 3. Restart function (ถ้าจำเป็น)
npx supabase functions delete send-registration-email
npx supabase functions deploy send-registration-email
```

### ปัญหา: ไม่มี Email Logs
**สาเหตุที่เป็นไปได้:**
- ❌ Migration ยังไม่ได้รัน
- ❌ RLS policy block การ insert
- ❌ User ไม่มีสิทธิ์อ่าน logs

**วิธีแก้:**
```bash
# รัน migration
npx supabase db push

# ตรวจสอบ RLS policies
# ใช้ SQL query ใน test-email-logs.sql (query #11)
```

### ปัญหา: JWT Authentication Error
**สาเหตุ:** Function ตั้งค่า `verify_jwt = true`

**วิธีแก้:**
```typescript
// ต้องส่ง Authorization header
const { data, error } = await supabase.functions.invoke(
  'send-registration-email',
  {
    body: emailData,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  }
);
```

---

## 📋 Checklist การทดสอบ

### Pre-deployment Checklist:
- [ ] ตรวจสอบ RESEND_API_KEY ตั้งค่าแล้ว
- [ ] ตรวจสอบ FROM_EMAIL verify กับ Resend แล้ว
- [ ] รัน database migrations
- [ ] Deploy Edge Functions
- [ ] ทดสอบ email template ใน browser

### Testing Checklist:
- [ ] ทดสอบส่งอีเมล registration
- [ ] ทดสอบส่งอีเมล payment_success
- [ ] ทดสอบส่งอีเมล status_update
- [ ] ตรวจสอบ email_logs ในฐานข้อมูล
- [ ] ทดสอบ error handling (API key ผิด, email ผิด)
- [ ] ตรวจสอบ RLS policies

### Production Monitoring:
- [ ] ตั้งค่า alerts สำหรับ failed emails
- [ ] Monitor email_logs เป็นประจำ
- [ ] ตรวจสอบ Resend dashboard สำหรับ delivery rate
- [ ] Backup email_logs เป็นระยะ

---

## 🎯 ข้อเสนอแนะการปรับปรุง

### 1. **Email Template Improvements**
```typescript
// เพิ่ม email template แบบ text/plain สำหรับ fallback
const emailResponse = await resend.emails.send({
  from: `Event Registration <${fromEmail}>`,
  to: [emailData.recipientEmail],
  subject: subject,
  html: html,
  text: plainText, // เพิ่มส่วนนี้
});
```

### 2. **Retry Mechanism**
```typescript
// เพิ่มการ retry อัตโนมัติสำหรับ failed emails
if (error) {
  // บันทึกใน queue สำหรับ retry
  await supabase.from('email_queue').insert({
    email_data: emailData,
    retry_count: 0,
    status: 'pending',
  });
}
```

### 3. **Rate Limiting**
```typescript
// เพิ่มการจำกัดจำนวนการส่งเพื่อป้องกัน spam
const recentEmails = await supabase
  .from('email_logs')
  .select('count')
  .eq('recipient_email', emailData.recipientEmail)
  .gte('created_at', new Date(Date.now() - 60000).toISOString());

if (recentEmails.count > 5) {
  throw new Error('Too many emails sent to this recipient');
}
```

### 4. **Email Template Versioning**
```typescript
// เก็บ version ของ template ใน email_logs
await supabase.from('email_logs').insert({
  ...emailLog,
  template_version: '1.0.0',
});
```

### 5. **Analytics Dashboard**
สร้าง dashboard สำหรับ:
- Email delivery rate
- Email open rate (ถ้า Resend รองรับ tracking)
- Failed email reasons
- Average delivery time

---

## 📚 เอกสารอ้างอิง

### ไฟล์ที่เกี่ยวข้อง:
- `supabase/functions/send-registration-email/index.ts` - Edge Function หลัก
- `supabase/migrations/20250930122126_*.sql` - Database schema สำหรับ email_logs
- `src/pages/EventRegistration.tsx:366` - การเรียกใช้จากหน้าลงทะเบียน
- `src/pages/AdminRegistrations.tsx:187,374` - การเรียกใช้จากหน้า admin
- `supabase/functions/handle-omise-webhook/index.ts:248,281` - การส่งอีเมลจาก payment webhook

### API Documentation:
- [Resend API Docs](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)

---

## ✅ สรุป

### โครงสร้างระบบ: **ดีมาก** ⭐⭐⭐⭐⭐
- โค้ดเขียนดี มี error handling ครบถ้วน
- Email templates สวยงามและรองรับภาษาไทย
- มีระบบ logging ครบถ้วน

### ความพร้อมใช้งาน: **ต้องตั้งค่าเพิ่มเติม** ⚙️
- ⚠️ ต้องตรวจสอบ RESEND_API_KEY
- ⚠️ ต้องตรวจสอบว่า function deploy แล้ว
- ⚠️ ต้องตรวจสอบ database migration

### คะแนนรวม: **8/10** 🎯
ระบบออกแบบมาดีและพร้อมใช้งาน เพียงแต่ต้องตั้งค่า API key และ deploy function ให้เรียบร้อย

---

**หมายเหตุ:** รายงานนี้สร้างขึ้นจากการตรวจสอบโค้ดและโครงสร้างเท่านั้น ยังไม่ได้ทดสอบการส่งอีเมลจริง เนื่องจากต้องมี RESEND_API_KEY และ function ต้อง deploy แล้ว
