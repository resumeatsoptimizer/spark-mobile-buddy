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
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { paymentId, amount } = await req.json();

    console.log('Processing refund:', { paymentId, amount });

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Payment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payment.omise_charge_id) {
      return new Response(
        JSON.stringify({ error: 'No Omise charge ID found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create refund with Omise
    const refundAmount = amount ? Math.round(amount * 100) : undefined; // Convert to satang if specified
    const omiseResponse = await fetch(`https://api.omise.co/charges/${payment.omise_charge_id}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: refundAmount, // If undefined, Omise will refund the full amount
      }),
    });

    const refund = await omiseResponse.json();
    console.log('Omise refund response:', refund);

    if (!omiseResponse.ok) {
      console.error('Omise refund failed:', refund);
      return new Response(
        JSON.stringify({ error: refund.message || 'Refund failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment record
    const refundAmountBaht = refund.amount / 100; // Convert from satang to baht
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_amount: refundAmountBaht,
        refunded_at: new Date().toISOString(),
        webhook_data: { ...payment.webhook_data, refund: refund },
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment:', updateError);
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
      console.error('Error updating registration:', regError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        refund,
        refundAmount: refundAmountBaht
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
