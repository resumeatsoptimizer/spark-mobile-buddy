import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing alert rules');

    // Get all enabled alert rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('alert_rules')
      .select('*')
      .eq('enabled', true);

    if (rulesError) throw rulesError;

    const triggeredAlerts = [];

    for (const rule of rules || []) {
      const { rule_type, condition_config } = rule;

      // Check if rule conditions are met
      let shouldTrigger = false;
      let alertData = {};

      if (rule_type === 'capacity_threshold') {
        // Check event capacity thresholds
        const threshold = condition_config.threshold || 90;
        const { data: events } = await supabaseClient
          .from('events')
          .select('id, title, seats_total, seats_remaining')
          .gt('seats_remaining', 0);

        const criticalEvents = events?.filter(e => {
          const utilization = ((e.seats_total - e.seats_remaining) / e.seats_total) * 100;
          return utilization >= threshold;
        }) || [];

        if (criticalEvents.length > 0) {
          shouldTrigger = true;
          alertData = { events: criticalEvents, threshold };
        }
      } else if (rule_type === 'failed_tasks') {
        // Check for failed tasks
        const threshold = condition_config.threshold || 5;
        const { count } = await supabaseClient
          .from('scheduled_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if ((count || 0) >= threshold) {
          shouldTrigger = true;
          alertData = { failed_count: count, threshold };
        }
      } else if (rule_type === 'payment_failures') {
        // Check for payment failures
        const threshold = condition_config.threshold || 10;
        const { count } = await supabaseClient
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if ((count || 0) >= threshold) {
          shouldTrigger = true;
          alertData = { failed_count: count, threshold };
        }
      }

      if (shouldTrigger) {
        triggeredAlerts.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          data: alertData
        });

        // Update last triggered time
        await supabaseClient
          .from('alert_rules')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', rule.id);

        // Log the alert as an analytics event
        await supabaseClient
          .from('analytics_events')
          .insert({
            event_type: 'alert_triggered',
            event_category: 'system',
            event_data: {
              rule_name: rule.rule_name,
              rule_type: rule.rule_type,
              alert_data: alertData
            }
          });
      }
    }

    console.log(`Processed ${rules?.length || 0} rules, triggered ${triggeredAlerts.length} alerts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        rules_processed: rules?.length || 0,
        alerts_triggered: triggeredAlerts.length,
        alerts: triggeredAlerts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in alert-processor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});