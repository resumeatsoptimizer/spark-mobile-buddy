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

    const { amount, currency, description, token, registrationId, return_uri } = await req.json();

    console.log('Creating Omise charge:', { amount, currency, description, registrationId, userId: user.id });

    // Validate required fields
    if (!amount || !token || !registrationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    if (amount <= 0 || amount > 10000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get registration details and verify ownership
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*, events(title)')
      .eq('id', registrationId)
      .eq('user_id', user.id) // Verify user owns this registration
      .single();

    if (regError || !registration) {
      return new Response(
        JSON.stringify({ error: 'Registration not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment already exists for this registration
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('registration_id', registrationId)
      .in('status', ['success', 'pending', 'processing'])
      .single();

    if (existingPayment) {
      return new Response(
        JSON.stringify({
          error: 'Payment already exists for this registration',
          paymentId: existingPayment.id,
          status: existingPayment.status,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate idempotency key
    const idempotencyKey = `charge_${registrationId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create charge with Omise
    const omiseResponse = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to satang
        currency: currency || 'THB',
        description: description || `Payment for ${registration.events.title}`,
        card: token,
        capture: true,
        return_uri: return_uri,
        metadata: {
          registration_id: registrationId,
          user_id: user.id,
          event_title: registration.events?.title,
        },
      }),
    });

    const charge = await omiseResponse.json();
    console.log('Omise charge response:', { id: charge.id, status: charge.status, paid: charge.paid });

    // Determine payment status
    let paymentStatus = 'pending';
    if (charge.paid) {
      paymentStatus = 'success';
    } else if (charge.failure_code) {
      paymentStatus = 'failed';
    } else if (charge.authorize_uri) {
      paymentStatus = 'processing'; // Requires 3DS
    }

    // Create payment record in database (even if failed, for audit trail)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        registration_id: registrationId,
        amount: amount,
        currency: currency || 'THB',
        status: paymentStatus,
        omise_charge_id: charge.id,
        card_brand: charge.card?.brand,
        card_last4: charge.card?.last_digits,
        receipt_url: charge.receipt_url,
        failure_code: charge.failure_code,
        failure_message: charge.failure_message,
        require_3ds: !!charge.authorize_uri,
        authorize_uri: charge.authorize_uri,
        payment_metadata: charge,
        idempotency_key: idempotencyKey,
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
    if (paymentStatus === 'success') {
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Failed to update registration:', updateError);
      }
    }

    // Return appropriate response based on status
    if (paymentStatus === 'failed') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment failed',
          paymentId: payment.id,
          failure_code: charge.failure_code,
          failure_message: charge.failure_message,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        chargeId: charge.id,
        status: paymentStatus,
        amount: charge.amount / 100,
        currency: charge.currency,
        require_3ds: !!charge.authorize_uri,
        authorize_uri: charge.authorize_uri,
        card: {
          brand: charge.card?.brand,
          last4: charge.card?.last_digits,
        },
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
