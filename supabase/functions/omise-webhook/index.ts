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
    if (key === 'charge.complete') {
      const chargeId = data.id;
      const metadata = data.metadata || {};
      const registrationId = metadata.registration_id;

      if (registrationId) {
        // Update payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            omise_charge_id: chargeId,
            card_last4: data.card?.last_digits,
            receipt_url: data.receipt_url,
            webhook_data: data,
          })
          .eq('omise_charge_id', chargeId);

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
        }

        // Update registration payment status
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
    }

    if (key === 'charge.failed') {
      const chargeId = data.id;
      const metadata = data.metadata || {};
      const registrationId = metadata.registration_id;

      if (registrationId) {
        // Update payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'failed',
            error_message: data.failure_message,
            webhook_data: data,
          })
          .eq('omise_charge_id', chargeId);

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
        }

        console.log(`Payment failed for registration ${registrationId}`);
      }
    }

    if (key === 'refund.created') {
      const refund = data;
      const chargeId = refund.charge;

      // Find payment by charge ID
      const { data: payment, error: findError } = await supabase
        .from('payments')
        .select('*')
        .eq('omise_charge_id', chargeId)
        .single();

      if (findError || !payment) {
        console.error('Payment not found for refund:', chargeId);
        return new Response(JSON.stringify({ error: 'Payment not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refund_amount: refund.amount / 100, // Convert from satang to baht
          refunded_at: new Date().toISOString(),
          webhook_data: { ...payment.webhook_data, refund: refund },
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating payment refund:', updateError);
      }

      // Update registration status
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
