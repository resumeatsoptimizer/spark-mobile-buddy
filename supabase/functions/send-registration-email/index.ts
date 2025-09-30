import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'registration' | 'payment_success' | 'status_update';
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string;
  registrationId: string;
  status?: string;
  amount?: number;
  ticketType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    console.log("Sending email:", emailData);

    const fromEmail = Deno.env.get("FROM_EMAIL") || "workbrandai@gmail.com";
    
    let subject = "";
    let html = "";

    switch (emailData.type) {
      case 'registration':
        subject = `ยืนยันการลงทะเบียน - ${emailData.eventTitle}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
              ยืนยันการลงทะเบียน
            </h1>
            <p>สวัสดีคุณ ${emailData.recipientName}</p>
            <p>ขอบคุณที่ลงทะเบียนเข้าร่วมกิจกรรม</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #0066cc; margin-top: 0;">รายละเอียดกิจกรรม</h2>
              <p><strong>ชื่อกิจกรรม:</strong> ${emailData.eventTitle}</p>
              <p><strong>วันที่:</strong> ${new Date(emailData.eventDate).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${emailData.eventLocation ? `<p><strong>สถานที่:</strong> ${emailData.eventLocation}</p>` : ''}
              ${emailData.ticketType ? `<p><strong>ประเภทบัตร:</strong> ${emailData.ticketType}</p>` : ''}
              <p><strong>หมายเลขการลงทะเบียน:</strong> ${emailData.registrationId}</p>
            </div>

            <p style="color: #666; margin-top: 20px;">
              หากมีข้อสงสัย กรุณาติดต่อเรา
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </div>
        `;
        break;

      case 'payment_success':
        subject = `ชำระเงินสำเร็จ - ${emailData.eventTitle}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #00cc66; padding-bottom: 10px;">
              ✓ ชำระเงินสำเร็จ
            </h1>
            <p>สวัสดีคุณ ${emailData.recipientName}</p>
            <p>ระบบได้รับการชำระเงินของคุณเรียบร้อยแล้ว</p>
            
            <div style="background-color: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00cc66;">
              <h2 style="color: #00cc66; margin-top: 0;">รายละเอียดการชำระเงิน</h2>
              <p><strong>ชื่อกิจกรรม:</strong> ${emailData.eventTitle}</p>
              <p><strong>จำนวนเงิน:</strong> ฿${emailData.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
              <p><strong>หมายเลขการลงทะเบียน:</strong> ${emailData.registrationId}</p>
              ${emailData.ticketType ? `<p><strong>ประเภทบัตร:</strong> ${emailData.ticketType}</p>` : ''}
            </div>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">รายละเอียดกิจกรรม</h3>
              <p><strong>วันที่:</strong> ${new Date(emailData.eventDate).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${emailData.eventLocation ? `<p><strong>สถานที่:</strong> ${emailData.eventLocation}</p>` : ''}
            </div>

            <p style="color: #666; margin-top: 20px;">
              ขอบคุณที่ใช้บริการของเรา
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </div>
        `;
        break;

      case 'status_update':
        subject = `อัปเดตสถานะการลงทะเบียน - ${emailData.eventTitle}`;
        const statusText = emailData.status === 'confirmed' ? 'ยืนยันแล้ว' : 
                          emailData.status === 'cancelled' ? 'ยกเลิกแล้ว' : 
                          emailData.status === 'waitlist' ? 'อยู่ในรายการรอ' : 
                          emailData.status || '';
        const statusColor = emailData.status === 'confirmed' ? '#00cc66' : 
                           emailData.status === 'cancelled' ? '#cc0000' : 
                           '#ff9900';
        
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid ${statusColor}; padding-bottom: 10px;">
              อัปเดตสถานะการลงทะเบียน
            </h1>
            <p>สวัสดีคุณ ${emailData.recipientName}</p>
            <p>สถานะการลงทะเบียนของคุณมีการเปลี่ยนแปลง</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
              <h2 style="color: ${statusColor}; margin-top: 0;">สถานะปัจจุบัน: ${statusText}</h2>
              <p><strong>ชื่อกิจกรรม:</strong> ${emailData.eventTitle}</p>
              <p><strong>วันที่:</strong> ${new Date(emailData.eventDate).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${emailData.eventLocation ? `<p><strong>สถานที่:</strong> ${emailData.eventLocation}</p>` : ''}
              <p><strong>หมายเลขการลงทะเบียน:</strong> ${emailData.registrationId}</p>
            </div>

            <p style="color: #666; margin-top: 20px;">
              หากมีข้อสงสัย กรุณาติดต่อเรา
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: `Event Registration <${fromEmail}>`,
      to: [emailData.recipientEmail],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_id: emailData.registrationId,
          recipient_email: emailData.recipientEmail,
          email_type: emailData.type,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }),
      });
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-registration-email function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
