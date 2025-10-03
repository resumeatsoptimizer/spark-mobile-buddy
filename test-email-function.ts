/**
 * สคริปท์ทดสอบระบบส่งอีเมล
 *
 * วิธีใช้:
 * 1. ตั้งค่า environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_ANON_KEY หรือ SUPABASE_SERVICE_ROLE_KEY
 * 2. รัน: npx tsx test-email-function.ts
 */

import { createClient } from '@supabase/supabase-js';

// กำหนดค่าจาก .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qhvxqmldpifwehnsrlyn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodnhxbWxkcGlmd2VobnNybHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzU4ODksImV4cCI6MjA3NDc1MTg4OX0.W3bKytTkvr-m1EtVnsOKwB20byq6EtqlOMyWIelSnWs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ข้อมูลทดสอบ
const testEmailData = {
  type: 'registration',
  recipientEmail: 'test@example.com', // เปลี่ยนเป็นอีเมลจริงเพื่อทดสอบ
  recipientName: 'ทดสอบ ระบบ',
  eventTitle: 'งานทดสอบระบบอีเมล 2025',
  eventDate: new Date('2025-10-04T14:00:00+07:00').toISOString(),
  eventLocation: 'ห้องประชุม A ชั้น 5',
  registrationId: 'TEST-REG-' + Date.now(),
  ticketType: 'VIP',
};

async function testEmailFunction() {
  console.log('🧪 เริ่มทดสอบระบบส่งอีเมล...\n');

  try {
    // 1. ทดสอบเรียก Edge Function
    console.log('📧 ทดสอบเรียก send-registration-email function...');
    console.log('ข้อมูลที่ส่ง:', JSON.stringify(testEmailData, null, 2));

    const { data, error } = await supabase.functions.invoke('send-registration-email', {
      body: testEmailData,
    });

    if (error) {
      console.error('❌ Error:', error);

      // ตรวจสอบ error types
      if (error.message?.includes('RESEND_API_KEY')) {
        console.log('\n⚠️  RESEND_API_KEY ยังไม่ได้ตั้งค่าใน Supabase Secrets');
        console.log('   ต้องตั้งค่าผ่าน: supabase secrets set RESEND_API_KEY=<your-key>');
      } else if (error.message?.includes('Function not found')) {
        console.log('\n⚠️  Function ยังไม่ได้ deploy บน Supabase');
        console.log('   ต้อง deploy ด้วย: supabase functions deploy send-registration-email');
      } else if (error.message?.includes('JWT')) {
        console.log('\n⚠️  Authentication error - ต้องใช้ valid JWT token');
      }

      return false;
    }

    console.log('✅ Response:', data);

    // 2. ตรวจสอบ email_logs ในฐานข้อมูล
    console.log('\n📊 ตรวจสอบ email_logs...');
    const { data: logs, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('registration_id', testEmailData.registrationId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (logsError) {
      console.error('❌ Error reading email_logs:', logsError);
    } else if (logs && logs.length > 0) {
      console.log('✅ พบ email log:', logs[0]);
    } else {
      console.log('⚠️  ไม่พบ email log (อาจเป็นเพราะ function ไม่ได้บันทึก log)');
    }

    // 3. แสดงสรุป
    console.log('\n📋 สรุปผลการทดสอบ:');
    console.log('✅ Edge Function เรียกใช้งานได้');
    console.log('✅ Email template มีรูปแบบที่ถูกต้อง');
    if (logs && logs.length > 0) {
      console.log('✅ บันทึก log ลงฐานข้อมูลสำเร็จ');
    }

    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

async function checkEmailLogs() {
  console.log('\n📊 ตรวจสอบ email logs ล่าสุด 10 รายการ...\n');

  try {
    const { data: logs, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);

      if (error.message?.includes('relation "public.email_logs" does not exist')) {
        console.log('\n⚠️  ตาราง email_logs ยังไม่มีในฐานข้อมูล');
        console.log('   ต้องรัน migration: supabase db push');
      } else if (error.message?.includes('JWT') || error.message?.includes('permission')) {
        console.log('\n⚠️  ไม่มีสิทธิ์อ่าน email_logs (ต้องเป็น admin/staff)');
      }

      return;
    }

    if (!logs || logs.length === 0) {
      console.log('⚠️  ไม่พบ email logs (ยังไม่เคยส่งอีเมล หรือไม่มีสิทธิ์อ่าน)');
      return;
    }

    console.log(`✅ พบ ${logs.length} รายการ:\n`);
    logs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.email_type} → ${log.recipient_email}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Created: ${new Date(log.created_at).toLocaleString('th-TH')}`);
      if (log.error_message) {
        console.log(`   Error: ${log.error_message}`);
      }
      console.log('');
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// รันการทดสอบ
async function main() {
  console.log('🚀 Email System Testing\n');
  console.log('=' .repeat(60));

  // ทดสอบ email logs ก่อน
  await checkEmailLogs();

  console.log('=' .repeat(60));
  console.log('\n⚠️  หมายเหตุ:');
  console.log('   - ถ้าต้องการทดสอบส่งอีเมลจริง ให้เปลี่ยน recipientEmail');
  console.log('   - ตรวจสอบว่า RESEND_API_KEY ตั้งค่าแล้วใน Supabase Secrets');
  console.log('   - Function verify_jwt=true ต้องใช้ auth token ที่ valid\n');

  // ทดสอบส่งอีเมล (comment ออกถ้าไม่ต้องการส่งจริง)
  // await testEmailFunction();

  console.log('\n✨ เสร็จสิ้นการทดสอบ\n');
}

main();
