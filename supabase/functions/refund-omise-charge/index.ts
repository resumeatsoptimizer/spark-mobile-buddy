import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const omiseSecretKey = Deno.env.get('OMISE_SECRET_KEY')!;

    // Check if Omise key is configured
    if (!omiseSecretKey) {
      console.error('OMISE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { paymentId, amount, reason } = await req.json();

    console.log('Processing refund:', { paymentId, amount, userId: user.id });

    // Validate required fields
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing payment ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        registrations!inner (
          id,
          user_id,
          event_id,
          events (title)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'ไม่พบรายการชำระเงิน' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user authorization (admin, staff, or payment owner)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถตรวจสอบสิทธิ์การเข้าถึงได้' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin');
    const isStaff = roles.includes('staff');
    const isOwner = payment.registrations.user_id === user.id;

    if (!isAdmin && !isStaff && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'คุณไม่มีสิทธิ์คืนเงินสำหรับรายการนี้' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment can be refunded
    const canRefundResult = await supabase.rpc('can_refund_payment', {
      p_payment_id: paymentId
    });

    if (canRefundResult.error || !canRefundResult.data) {
      return new Response(
        JSON.stringify({
          error: 'ไม่สามารถคืนเงินรายการนี้ได้',
          reason: 'อาจเป็นเพราะคืนเงินครบแล้ว ชำระไม่สำเร็จ หรือเกินเวลาที่สามารถคืนเงินได้ (6 เดือน)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate refund amount
    const refundAmount = amount || (payment.amount - payment.refund_amount);
    const maxRefundable = payment.amount - payment.refund_amount;

    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      return new Response(
        JSON.stringify({
          error: `จำนวนเงินที่คืนไม่ถูกต้อง ต้องอยู่ระหว่าง 0 ถึง ${maxRefundable} บาท`,
          maxRefundable: maxRefundable
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate idempotency key
    const idempotencyKey = `refund_${paymentId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create refund with Omise
    const omiseResponse = await fetch(`https://api.omise.co/charges/${payment.omise_charge_id}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: Math.round(refundAmount * 100), // Convert to satang
        metadata: {
          payment_id: paymentId,
          user_id: user.id,
          reason: reason || 'Customer requested refund',
        },
      }),
    });

    const refund = await omiseResponse.json();
    console.log('Omise refund response:', { id: refund.id, amount: refund.amount });

    // Check for Omise errors
    if (!omiseResponse.ok || refund.object === 'error') {
      console.error('Omise refund failed:', refund);
      return new Response(
        JSON.stringify({
          error: 'ไม่สามารถคืนเงินผ่านระบบชำระเงินได้',
          message: refund.message || 'เกิดข้อผิดพลาดจากระบบชำระเงิน'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment record
    const newRefundAmount = payment.refund_amount + (refund.amount / 100);
    const isFullyRefunded = newRefundAmount >= payment.amount;

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: isFullyRefunded ? 'refunded' : 'success',
        refund_amount: newRefundAmount,
        refunded_at: isFullyRefunded ? new Date().toISOString() : payment.refunded_at,
        payment_metadata: {
          ...payment.payment_metadata,
          refunds: [...(payment.payment_metadata?.refunds || []), refund]
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
      // Refund was created but DB update failed - log for manual reconciliation
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'Refund created but database update failed',
          refundId: refund.id,
          amount: refund.amount / 100,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update registration if fully refunded
    if (isFullyRefunded) {
      await supabase
        .from('registrations')
        .update({
          payment_status: 'unpaid',
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.registration_id);
    }

    // Log audit trail
    await supabase.rpc('log_payment_action', {
      p_payment_id: paymentId,
      p_action_type: 'refunded',
      p_previous_status: payment.status,
      p_new_status: isFullyRefunded ? 'refunded' : 'success',
      p_amount: refundAmount,
      p_metadata: {
        omise_refund_id: refund.id,
        reason: reason || 'Customer requested refund',
        refunded_by: user.id,
      }
    });

    // Send refund email
    try {
      const { data: registration } = await supabase
        .from('registrations')
        .select(`
          *,
          events (title),
          profiles (name, email)
        `)
        .eq('id', payment.registration_id)
        .single();

      if (registration) {
        await supabase.functions.invoke('send-registration-email', {
          body: {
            type: 'payment_refunded',
            recipientEmail: registration.profiles.email,
            recipientName: registration.profiles.name,
            eventTitle: registration.events.title,
            registrationId: payment.registration_id,
            amount: refundAmount,
            isFullRefund: isFullyRefunded,
          },
        });
      }
    } catch (emailError) {
      console.error('Failed to send refund email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        isFullRefund: isFullyRefunded,
        newRefundAmount: newRefundAmount,
        remainingBalance: payment.amount - newRefundAmount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
