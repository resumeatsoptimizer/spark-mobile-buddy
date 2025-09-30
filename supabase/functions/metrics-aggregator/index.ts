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

    console.log('Starting metrics aggregation');

    const now = new Date();
    const metrics = [];

    // Aggregate event metrics
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('id, seats_total, seats_remaining, created_at');

    if (eventsError) throw eventsError;

    // Total events
    metrics.push({
      metric_type: 'events',
      metric_name: 'total_events',
      metric_value: events?.length || 0,
      metadata: { timestamp: now.toISOString() }
    });

    // Total capacity utilization
    const totalSeats = events?.reduce((sum, e) => sum + e.seats_total, 0) || 0;
    const remainingSeats = events?.reduce((sum, e) => sum + e.seats_remaining, 0) || 0;
    const utilization = totalSeats > 0 ? ((totalSeats - remainingSeats) / totalSeats) * 100 : 0;

    metrics.push({
      metric_type: 'events',
      metric_name: 'capacity_utilization',
      metric_value: utilization,
      metadata: { timestamp: now.toISOString() }
    });

    // Registration metrics
    const { count: totalRegistrations, error: regError } = await supabaseClient
      .from('registrations')
      .select('*', { count: 'exact', head: true });

    if (regError) throw regError;

    metrics.push({
      metric_type: 'registrations',
      metric_name: 'total_registrations',
      metric_value: totalRegistrations || 0,
      metadata: { timestamp: now.toISOString() }
    });

    // Payment metrics
    const { data: payments, error: paymentError } = await supabaseClient
      .from('payments')
      .select('amount, status');

    if (paymentError) throw paymentError;

    const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const successfulPayments = payments?.filter(p => p.status === 'succeeded').length || 0;

    metrics.push(
      {
        metric_type: 'payments',
        metric_name: 'total_revenue',
        metric_value: totalRevenue,
        metadata: { timestamp: now.toISOString() }
      },
      {
        metric_type: 'payments',
        metric_name: 'successful_payments',
        metric_value: successfulPayments,
        metadata: { timestamp: now.toISOString() }
      }
    );

    // Waitlist metrics
    const { count: waitlistCount, error: waitlistError } = await supabaseClient
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (waitlistError) throw waitlistError;

    metrics.push({
      metric_type: 'waitlist',
      metric_name: 'total_waitlisted',
      metric_value: waitlistCount || 0,
      metadata: { timestamp: now.toISOString() }
    });

    // System health metrics
    const { count: failedTasks, error: tasksError } = await supabaseClient
      .from('scheduled_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    if (tasksError) throw tasksError;

    metrics.push({
      metric_type: 'system',
      metric_name: 'failed_tasks',
      metric_value: failedTasks || 0,
      metadata: { timestamp: now.toISOString() }
    });

    // Insert all metrics
    const { error: insertError } = await supabaseClient
      .from('system_metrics')
      .insert(metrics);

    if (insertError) throw insertError;

    console.log(`Aggregated ${metrics.length} metrics successfully`);

    return new Response(
      JSON.stringify({ success: true, metrics_count: metrics.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in metrics-aggregator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});