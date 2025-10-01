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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Omise webhook received:', payload);

    const { key, data } = payload;

    // Handle different event types
    switch (key) {
      case 'charge.complete':
      case 'charge.create':
        await handleChargeComplete(data, supabase);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(data, supabase);
        break;
      
      case 'refund.created':
        await handleRefundCreated(data, supabase);
        break;

      case 'source.chargeable':
        await handleSourceChargeable(data, supabase);
        break;

      case 'charge.pending':
        await handleChargePending(data, supabase);
        break;

      case 'charge.expired':
        await handleChargeExpired(data, supabase);
        break;
      
      default:
        console.log('Unhandled event type:', key);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleChargeComplete(data: any, supabase: any) {
  const chargeId = data.id;
  const metadata = data.metadata || {};
  const registrationId = metadata.registration_id;

  if (!registrationId) return;

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'success',
      card_last4: data.card?.last_digits,
      receipt_url: data.receipt_url,
      webhook_data: data,
    })
    .eq('omise_charge_id', chargeId);

  if (paymentError) {
    console.error('Error updating payment:', paymentError);
  }

  const { error: regError } = await supabase
    .from('registrations')
    .update({ 
      payment_status: 'paid',
      status: 'confirmed'
    })
    .eq('id', registrationId);

  if (regError) {
    console.error('Error updating registration:', regError);
  }

  console.log(`Payment completed for registration ${registrationId}`);
}

async function handleChargeFailed(data: any, supabase: any) {
  const chargeId = data.id;
  const metadata = data.metadata || {};
  const registrationId = metadata.registration_id;

  if (!registrationId) return;

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_message: data.failure_message,
      failure_code: data.failure_code,
      webhook_data: data,
    })
    .eq('omise_charge_id', chargeId);

  if (paymentError) {
    console.error('Error updating payment:', paymentError);
  }

  console.log(`Payment failed for registration ${registrationId}`);
}

async function handleRefundCreated(data: any, supabase: any) {
  const refund = data;
  const chargeId = refund.charge;

  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('id, registration_id')
    .eq('omise_charge_id', chargeId)
    .single();

  if (findError || !payment) {
    console.error('Payment not found for refund:', chargeId);
    return;
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refund_amount: refund.amount / 100,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('Error updating payment refund:', updateError);
  }

  const { error: regError } = await supabase
    .from('registrations')
    .update({ 
      payment_status: 'refunded',
      status: 'cancelled'
    })
    .eq('id', payment.registration_id);

  if (regError) {
    console.error('Error updating registration after refund:', regError);
  }

  console.log(`Refund processed for payment ${payment.id}`);
}

async function handleSourceChargeable(data: any, supabase: any) {
  console.log('Processing source.chargeable for:', data.id);
  
  const { error } = await supabase
    .from('payments')
    .update({ 
      status: 'pending',
      payment_metadata: {
        source_status: data.status,
        updated_at: new Date().toISOString()
      }
    })
    .eq('source_id', data.id);

  if (error) {
    console.error('Failed to update payment for source.chargeable:', error);
  }
}

async function handleChargePending(data: any, supabase: any) {
  console.log('Processing charge.pending for:', data.id);
  
  const { error } = await supabase
    .from('payments')
    .update({ 
      status: 'pending',
      payment_metadata: {
        charge_status: data.status,
        updated_at: new Date().toISOString()
      }
    })
    .eq('omise_charge_id', data.id);

  if (error) {
    console.error('Failed to update payment for charge.pending:', error);
  }
}

async function handleChargeExpired(data: any, supabase: any) {
  console.log('Processing charge.expired for:', data.id);
  
  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('registration_id')
    .eq('omise_charge_id', data.id)
    .single();

  if (findError || !payment) {
    console.error('Failed to find payment for expired charge:', findError);
    return;
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({ 
      status: 'failed',
      failure_message: 'QR Code expired',
      payment_metadata: {
        charge_status: 'expired',
        expired_at: new Date().toISOString()
      }
    })
    .eq('omise_charge_id', data.id);

  if (updateError) {
    console.error('Failed to update payment for expired charge:', updateError);
  }
}
