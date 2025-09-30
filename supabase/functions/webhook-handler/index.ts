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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { event_type, event_data, organization_id } = await req.json();

    console.log('Processing webhook:', event_type, 'for org:', organization_id);

    // Fetch active webhooks for this organization that listen to this event
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('webhooks')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (webhooksError) {
      throw webhooksError;
    }

    const relevantWebhooks = webhooks?.filter(webhook => {
      const events = webhook.events as string[];
      return events.includes(event_type) || events.includes('*');
    }) || [];

    console.log(`Found ${relevantWebhooks.length} webhooks to trigger`);

    // Send webhook to each endpoint
    const results = await Promise.allSettled(
      relevantWebhooks.map(async (webhook) => {
        const payload = {
          event_type,
          event_data,
          timestamp: new Date().toISOString(),
          webhook_id: webhook.id
        };

        // Create signature for verification
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload) + webhook.secret_key);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        let retryCount = 0;
        const maxRetries = webhook.retry_config?.max_retries || 3;
        const retryDelay = webhook.retry_config?.retry_delay || 60;

        while (retryCount <= maxRetries) {
          try {
            const response = await fetch(webhook.webhook_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-ID': webhook.id
              },
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              // Update last triggered timestamp
              await supabaseClient
                .from('webhooks')
                .update({ last_triggered_at: new Date().toISOString() })
                .eq('id', webhook.id);

              console.log(`Webhook ${webhook.id} delivered successfully`);
              return { success: true, webhook_id: webhook.id };
            } else {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
          } catch (error) {
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`Retry ${retryCount}/${maxRetries} for webhook ${webhook.id} after ${retryDelay}s`);
              await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
            } else {
              console.error(`Webhook ${webhook.id} failed after ${maxRetries} retries:`, error);
              throw error;
            }
          }
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        webhooks_triggered: relevantWebhooks.length,
        successful,
        failed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error processing webhooks:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
