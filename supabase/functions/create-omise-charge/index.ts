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

    const { amount, currency, description, token, registrationId } = await req.json();

    console.log('Creating Omise charge:', { amount, currency, description, registrationId });

    // Validate required fields
    if (!amount || !token || !registrationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get registration details
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      return new Response(
        JSON.stringify({ error: 'Registration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create charge with Omise
    const omiseResponse = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to satang
        currency: currency || 'THB',
        description: description || `Payment for ${registration.events.title}`,
        card: token,
        metadata: {
          registration_id: registrationId,
          event_id: registration.event_id,
        },
      }),
    });

    const charge = await omiseResponse.json();
    console.log('Omise charge response:', charge);

    if (!omiseResponse.ok) {
      console.error('Omise charge failed:', charge);
      return new Response(
        JSON.stringify({ error: charge.message || 'Payment failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        registration_id: registrationId,
        amount: amount,
        currency: currency || 'THB',
        status: charge.status === 'successful' ? 'completed' : 'pending',
        omise_charge_id: charge.id,
        card_last4: charge.card?.last_digits,
        receipt_url: charge.receipt_url,
        webhook_data: charge,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If charge is immediately successful, update registration
    if (charge.status === 'successful') {
      await supabase
        .from('registrations')
        .update({ 
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', registrationId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        charge,
        payment 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating charge:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
