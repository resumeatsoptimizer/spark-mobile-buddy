// ============================================
// Supabase Edge Function: Handle Omise Webhook
// Purpose: Process payment notifications from Omise
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const OMISE_WEBHOOK_SECRET = Deno.env.get('OMISE_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-omise-signature',
};

interface WebhookEvent {
  object: string;
  id: string;
  livemode: boolean;
  location: string;
  created: string;
  key: string;
  data: {
    object: string;
    id: string;
    status: string;
    paid: boolean;
    amount: number;
    currency: string;
    metadata: {
      registration_id?: string;
      user_id?: string;
    };
    card?: {
      brand: string;
      last_digits: string;
    };
    failure_code?: string;
    failure_message?: string;
  };
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!OMISE_WEBHOOK_SECRET) {
    console.error('OMISE_WEBHOOK_SECRET not configured');
    return false;
  }

  const hmac = createHmac('sha256', OMISE_WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64');

  return signature === expectedSignature;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get webhook signature
    const signature = req.headers.get('x-omise-signature');
    const rawBody = await req.text();

    // Verify signature (if configured)
    if (OMISE_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const event: WebhookEvent = JSON.parse(rawBody);
    console.log('Received webhook:', { id: event.id, key: event.key });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Store webhook event
    const { error: webhookError } = await supabase
      .from('payment_webhooks')
      .insert({
        webhook_id: event.id,
        event_type: event.key,
        payment_id: null, // Will be updated later
        payload: event,
        processed: false,
      });

    if (webhookError) {
      console.error('Failed to store webhook:', webhookError);
    }

    // Process based on event type
    switch (event.key) {
      case 'charge.complete':
      case 'charge.create':
        await handleChargeEvent(supabase, event);
        break;

      case 'charge.update':
        await handleChargeUpdate(supabase, event);
        break;

      case 'refund.create':
        await handleRefundEvent(supabase, event);
        break;

      default:
        console.log('Unhandled webhook event:', event.key);
    }

    // Mark webhook as processed
    await supabase
      .from('payment_webhooks')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('webhook_id', event.id);

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Handle charge events
async function handleChargeEvent(supabase: any, event: WebhookEvent) {
  const charge = event.data;
  const registrationId = charge.metadata?.registration_id;

  if (!registrationId) {
    console.error('No registration_id in charge metadata');
    return;
  }

  // Find payment by charge ID
  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('id, status, registration_id')
    .eq('omise_charge_id', charge.id)
    .single();

  if (findError || !payment) {
    console.error('Payment not found for charge:', charge.id);
    return;
  }

  // Determine new status
  let newStatus = 'pending';
  if (charge.paid) {
    newStatus = 'success';
  } else if (charge.failure_code) {
    newStatus = 'failed';
  }

  // Update payment if status changed
  if (payment.status !== newStatus) {
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        failure_code: charge.failure_code,
        failure_message: charge.failure_message,
        payment_metadata: charge,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return;
    }

    // Update registration if payment successful
    if (newStatus === 'success') {
      await supabase
        .from('registrations')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
        })
        .eq('id', payment.registration_id);

      // Send success email
      try {
        const { data: registration } = await supabase
          .from('registrations')
          .select(`
            *,
            events (title, start_date, location),
            profiles (name, email),
            ticket_types (name)
          `)
          .eq('id', payment.registration_id)
          .single();

        if (registration) {
          await supabase.functions.invoke('send-registration-email', {
            body: {
              type: 'payment_success',
              recipientEmail: registration.profiles.email,
              recipientName: registration.profiles.name,
              eventTitle: registration.events.title,
              eventDate: registration.events.start_date,
              eventLocation: registration.events.location,
              registrationId: payment.registration_id,
              amount: payment.amount,
              ticketType: registration.ticket_types?.name,
            },
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment success email:', emailError);
      }
    }

    // Send failure email if payment failed
    if (newStatus === 'failed') {
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
              type: 'payment_failed',
              recipientEmail: registration.profiles.email,
              recipientName: registration.profiles.name,
              eventTitle: registration.events.title,
              registrationId: payment.registration_id,
              failureReason: charge.failure_message || 'Payment declined',
            },
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment failure email:', emailError);
      }
    }

    console.log(`Payment ${payment.id} updated to ${newStatus}`);
  }

  // Update webhook with payment ID
  await supabase
    .from('payment_webhooks')
    .update({ payment_id: payment.id })
    .eq('webhook_id', event.id);
}

// Handle charge update events
async function handleChargeUpdate(supabase: any, event: WebhookEvent) {
  await handleChargeEvent(supabase, event);
}

// Handle refund events
async function handleRefundEvent(supabase: any, event: WebhookEvent) {
  const refundData = event.data;

  // Extract charge ID from refund data
  // Note: Omise refund object structure may vary
  const chargeId = (refundData as any).charge;

  if (!chargeId) {
    console.error('No charge ID in refund data');
    return;
  }

  // Find payment by charge ID
  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('id, amount, refund_amount, registration_id')
    .eq('omise_charge_id', chargeId)
    .single();

  if (findError || !payment) {
    console.error('Payment not found for refund:', chargeId);
    return;
  }

  // Calculate new refund amount
  const refundAmount = (refundData as any).amount / 100; // Convert from satangs
  const totalRefunded = payment.refund_amount + refundAmount;

  // Update payment
  const newStatus = totalRefunded >= payment.amount ? 'refunded' : 'success';

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: newStatus,
      refund_amount: totalRefunded,
      refunded_at: totalRefunded >= payment.amount ? new Date().toISOString() : payment.refunded_at,
      payment_metadata: refundData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('Failed to update payment with refund:', updateError);
    return;
  }

  // Update registration if fully refunded
  if (newStatus === 'refunded') {
    await supabase
      .from('registrations')
      .update({
        payment_status: 'unpaid',
        status: 'cancelled',
      })
      .eq('id', payment.registration_id);
  }

  console.log(`Payment ${payment.id} refunded: ฿${refundAmount}`);

  // Update webhook with payment ID
  await supabase
    .from('payment_webhooks')
    .update({ payment_id: payment.id })
    .eq('webhook_id', event.id);
}
