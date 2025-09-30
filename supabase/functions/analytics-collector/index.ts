import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  event_type: string;
  event_category: string;
  event_data?: Record<string, any>;
  user_id?: string;
  event_id?: string;
  registration_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { events }: { events: AnalyticsEvent[] } = await req.json();

    console.log(`Collecting ${events.length} analytics events`);

    // Insert all events in batch
    const { data, error } = await supabaseClient
      .from('analytics_events')
      .insert(events);

    if (error) {
      console.error('Error inserting analytics events:', error);
      throw error;
    }

    // Also collect system metrics
    const metrics = [
      {
        metric_type: 'analytics',
        metric_name: 'events_collected',
        metric_value: events.length,
        metadata: { timestamp: new Date().toISOString() }
      }
    ];

    await supabaseClient.from('system_metrics').insert(metrics);

    console.log('Analytics events collected successfully');

    return new Response(
      JSON.stringify({ success: true, count: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in analytics-collector:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});