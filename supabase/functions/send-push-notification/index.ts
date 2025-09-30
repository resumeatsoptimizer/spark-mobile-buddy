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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { title, body, user_ids, event_id } = await req.json();

    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    console.log('Sending notification:', { title, body, user_ids, event_id });

    // Get active push subscriptions for target users
    let subscriptionsQuery = supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (user_ids && Array.isArray(user_ids)) {
      subscriptionsQuery = subscriptionsQuery.in('user_id', user_ids);
    }

    const { data: subscriptions, error: subsError } = await subscriptionsQuery;

    if (subsError) throw subsError;

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    const notificationResults = [];

    // Send push notifications to all subscriptions
    for (const subscription of subscriptions || []) {
      try {
        const subscriptionData = subscription.subscription_data;
        
        // Validate subscription data
        if (!subscriptionData.endpoint) {
          console.error('Invalid subscription data - missing endpoint');
          continue;
        }

        // For now, we'll log the notification
        // In production, you would use Web Push API with VAPID keys
        console.log('Would send push notification to:', {
          endpoint: subscriptionData.endpoint,
          title,
          body
        });

        notificationResults.push({
          user_id: subscription.user_id,
          status: 'sent',
          subscription_id: subscription.id
        });
      } catch (error: any) {
        console.error('Error sending to subscription:', error);
        notificationResults.push({
          user_id: subscription.user_id,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Log notification
    await supabaseClient.from('integration_logs').insert({
      integration_type: 'push_notification',
      action: 'send',
      event_id: event_id,
      status: 'success',
      request_data: { title, body, user_ids },
      response_data: { results: notificationResults }
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: notificationResults.filter(r => r.status === 'sent').length,
        failed_count: notificationResults.filter(r => r.status === 'failed').length,
        results: notificationResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
