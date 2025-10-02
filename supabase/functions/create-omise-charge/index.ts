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
    const omiseSecretKey = Deno.env.get('OMISE_SECRET_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasOmiseKey: !!omiseSecretKey,
      omiseKeyLength: omiseSecretKey?.length || 0,
    });

    if (!omiseSecretKey || omiseSecretKey.trim() === '') {
      console.error('OMISE_SECRET_KEY not configured or empty');
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway not configured',
          details: 'OMISE_SECRET_KEY is missing or empty. Please configure it in your backend secrets.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, token, registrationId, paymentMethod = 'card', returnUri } = await req.json();
    
    console.log('Creating Omise payment:', { amount, registrationId, userId: user.id, paymentMethod });

    if (!amount || !registrationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment method requires token for card
    if (paymentMethod === 'card' && !token) {
      return new Response(
        JSON.stringify({ error: 'Card token is required for card payments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0 || amount > 10000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*, events(title)')
      .eq('id', registrationId)
      .eq('user_id', user.id)
      .single();

    if (regError || !registration) {
      return new Response(
        JSON.stringify({ error: 'Registration not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('registration_id', registrationId)
      .in('status', ['success', 'pending'])
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

    const idempotencyKey = `charge_${registrationId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const eventTitle = registration.events?.title || 'Event';

    let sourceId = null;
    let qrCodeData = null;
    let charge;

    // Handle PromptPay payment
    if (paymentMethod === 'promptpay') {
      // Create PromptPay source
      const sourceResponse = await fetch('https://api.omise.co/sources', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          amount: Math.round(amount * 100).toString(),
          currency: 'THB',
          type: 'promptpay'
        }).toString()
      });

      if (!sourceResponse.ok) {
        const errorData = await sourceResponse.json();
        console.error('Omise source creation error:', errorData);
        throw new Error(errorData.message || 'Failed to create PromptPay source');
      }

      const source = await sourceResponse.json();
      sourceId = source.id;
      
      // Extract QR code URL
      const qrCodeUrl = source.scannable_code?.image?.download_uri || null;
      
      // CRITICAL VALIDATION: QR code URL must exist for PromptPay
      if (!qrCodeUrl) {
        console.error('PromptPay QR code generation failed:', {
          sourceId: source.id,
          scannableCode: source.scannable_code,
          status: source.flow
        });
        return new Response(
          JSON.stringify({ 
            error: 'QR code generation failed',
            details: 'Unable to generate PromptPay QR code. This may be due to account configuration issues. Please contact support or try again later.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      qrCodeData = {
        qr_code_url: qrCodeUrl,
        expires_at: source.expires_at,
        amount: source.amount / 100,
        currency: source.currency
      };

      console.log('PromptPay source created:', { sourceId, qrCodeData });

      // Create charge with source
      const chargeResponse = await fetch('https://api.omise.co/charges', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'THB',
          source: sourceId,
          description: `Payment for ${eventTitle}`,
          return_uri: returnUri || `${supabaseUrl}/registrations`,
          metadata: {
            registration_id: registrationId,
            user_id: user.id,
            event_title: eventTitle,
            payment_method: 'promptpay'
          },
        }),
      });

      charge = await chargeResponse.json();
    } else {
      // Create card charge
      const chargeResponse = await fetch('https://api.omise.co/charges', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'THB',
          card: token,
          description: `Payment for ${eventTitle}`,
          capture: true,
          return_uri: returnUri || `${supabaseUrl}/registrations`,
          metadata: {
            registration_id: registrationId,
            user_id: user.id,
            event_title: eventTitle,
            payment_method: 'card'
          },
        }),
      });

      charge = await chargeResponse.json();
    }

    console.log('Omise charge response:', { id: charge.id, status: charge.status, paid: charge.paid, paymentMethod });

    // Determine payment status
    const requireAction = !!charge.authorize_uri && charge.status !== 'successful';
    const require3ds = requireAction;
    let paymentStatus = 'pending';
    
    if (paymentMethod === 'promptpay') {
      paymentStatus = 'pending';
    } else if (charge.paid) {
      paymentStatus = 'success';
    } else if (require3ds) {
      paymentStatus = 'pending';
    } else if (charge.failure_code || charge.failure_message) {
      paymentStatus = 'failed';
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        registration_id: registrationId,
        amount: amount,
        currency: 'THB',
        status: paymentStatus,
        omise_charge_id: charge.id,
        payment_method: paymentMethod,
        source_id: sourceId,
        qr_code_data: qrCodeData || {},
        card_brand: charge.card?.brand || null,
        card_last4: charge.card?.last_digits || null,
        receipt_url: charge.receipt_url || null,
        authorize_uri: charge.authorize_uri || null,
        require_3ds: require3ds,
        failure_code: charge.failure_code || null,
        failure_message: charge.failure_message || null,
        idempotency_key: idempotencyKey,
        payment_metadata: {
          charge_status: charge.status,
          authorized: charge.authorized,
          capturable: charge.capturable,
          reversible: charge.reversible
        }
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

    // Update registration if payment successful
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

    // Handle failed payments
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
        charge_id: charge.id,
        status: paymentStatus,
        amount: charge.amount / 100,
        currency: charge.currency,
        require_3ds: require3ds,
        authorize_uri: charge.authorize_uri,
        payment_method: paymentMethod,
        qr_code_data: qrCodeData,
        source_id: sourceId,
        card: charge.card ? {
          brand: charge.card.brand,
          last4: charge.card.last_digits,
        } : null,
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
