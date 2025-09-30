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

    const { report_type, start_date, end_date, event_id } = await req.json();

    console.log(`Generating ${report_type} report from ${start_date} to ${end_date}`);

    let reportData: any = {};

    if (report_type === 'event_performance') {
      // Event performance report
      let query = supabaseClient
        .from('events')
        .select(`
          id,
          title,
          seats_total,
          seats_remaining,
          created_at,
          registrations (
            id,
            status,
            payment_status,
            created_at
          )
        `)
        .gte('created_at', start_date)
        .lte('created_at', end_date);

      if (event_id) {
        query = query.eq('id', event_id);
      }

      const { data: events, error } = await query;
      if (error) throw error;

      reportData = {
        type: 'event_performance',
        period: { start: start_date, end: end_date },
        events: events?.map(event => ({
          ...event,
          utilization: ((event.seats_total - event.seats_remaining) / event.seats_total) * 100,
          total_registrations: event.registrations?.length || 0,
          confirmed: event.registrations?.filter((r: any) => r.status === 'confirmed').length || 0,
          paid: event.registrations?.filter((r: any) => r.payment_status === 'paid').length || 0
        })) || []
      };
    } else if (report_type === 'financial') {
      // Financial report
      const { data: payments, error } = await supabaseClient
        .from('payments')
        .select('*')
        .gte('created_at', start_date)
        .lte('created_at', end_date);

      if (error) throw error;

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const successfulPayments = payments?.filter(p => p.status === 'succeeded') || [];
      const failedPayments = payments?.filter(p => p.status === 'failed') || [];
      const refunded = payments?.filter(p => p.refunded_at) || [];

      reportData = {
        type: 'financial',
        period: { start: start_date, end: end_date },
        summary: {
          total_revenue: totalRevenue,
          successful_payments: successfulPayments.length,
          failed_payments: failedPayments.length,
          refunded_count: refunded.length,
          refunded_amount: refunded.reduce((sum, p) => sum + Number(p.refund_amount || 0), 0)
        },
        payments
      };
    } else if (report_type === 'system_health') {
      // System health report
      const { data: tasks, error: tasksError } = await supabaseClient
        .from('scheduled_tasks')
        .select('*')
        .gte('created_at', start_date)
        .lte('created_at', end_date);

      if (tasksError) throw tasksError;

      const { data: metrics, error: metricsError } = await supabaseClient
        .from('system_metrics')
        .select('*')
        .gte('recorded_at', start_date)
        .lte('recorded_at', end_date)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (metricsError) throw metricsError;

      reportData = {
        type: 'system_health',
        period: { start: start_date, end: end_date },
        summary: {
          total_tasks: tasks?.length || 0,
          completed_tasks: tasks?.filter(t => t.status === 'completed').length || 0,
          failed_tasks: tasks?.filter(t => t.status === 'failed').length || 0,
          pending_tasks: tasks?.filter(t => t.status === 'pending').length || 0
        },
        tasks,
        metrics
      };
    }

    console.log(`Report generated successfully: ${report_type}`);

    return new Response(
      JSON.stringify({ success: true, report: reportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in report-generator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});