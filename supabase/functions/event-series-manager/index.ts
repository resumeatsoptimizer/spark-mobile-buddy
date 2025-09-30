import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, seriesId, seriesData, generateUntil } = await req.json();

    if (action === 'create') {
      // Create event series
      const { data: series, error: seriesError } = await supabase
        .from('event_series')
        .insert([seriesData])
        .select()
        .single();

      if (seriesError) throw seriesError;

      // Generate initial events based on recurrence rule
      const events = generateRecurringEvents(series, generateUntil);
      
      if (events.length > 0) {
        const { error: eventsError } = await supabase
          .from('events')
          .insert(events);

        if (eventsError) throw eventsError;
      }

      return new Response(JSON.stringify({ series, eventsGenerated: events.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate') {
      // Generate more events for existing series
      const { data: series, error: seriesError } = await supabase
        .from('event_series')
        .select('*')
        .eq('id', seriesId)
        .single();

      if (seriesError) throw seriesError;

      // Get latest event in series
      const { data: latestEvent } = await supabase
        .from('events')
        .select('start_date')
        .eq('series_id', seriesId)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      const startFrom = latestEvent ? new Date(latestEvent.start_date) : new Date();
      const events = generateRecurringEvents(series, generateUntil, startFrom);

      if (events.length > 0) {
        const { error: eventsError } = await supabase
          .from('events')
          .insert(events);

        if (eventsError) throw eventsError;
      }

      return new Response(JSON.stringify({ eventsGenerated: events.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      // Update series and optionally update future events
      const { updateFutureEvents, ...updateData } = seriesData;

      const { data: series, error: seriesError } = await supabase
        .from('event_series')
        .update(updateData)
        .eq('id', seriesId)
        .select()
        .single();

      if (seriesError) throw seriesError;

      if (updateFutureEvents) {
        // Update all future events in series
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: series.template_data.title,
            description: series.template_data.description,
            location: series.template_data.location,
            // Update other fields as needed
          })
          .eq('series_id', seriesId)
          .gte('start_date', new Date().toISOString());

        if (updateError) throw updateError;
      }

      return new Response(JSON.stringify({ series }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      // Delete series and optionally delete all events
      const { deleteEvents } = await req.json();

      if (deleteEvents) {
        const { error: eventsError } = await supabase
          .from('events')
          .delete()
          .eq('series_id', seriesId);

        if (eventsError) throw eventsError;
      }

      const { error: seriesError } = await supabase
        .from('event_series')
        .delete()
        .eq('id', seriesId);

      if (seriesError) throw seriesError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in event-series-manager:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateRecurringEvents(series: any, until: string, startFrom?: Date) {
  const events = [];
  const rule = series.recurrence_rule;
  const template = series.template_data;
  
  let currentDate = startFrom || new Date(rule.start_date);
  const endDate = new Date(until);
  const frequency = rule.frequency; // 'daily', 'weekly', 'monthly'
  const interval = rule.interval || 1;

  while (currentDate <= endDate) {
    const eventDuration = new Date(template.end_date).getTime() - new Date(template.start_date).getTime();
    const eventStartDate = new Date(currentDate);
    const eventEndDate = new Date(currentDate.getTime() + eventDuration);

    events.push({
      ...template,
      start_date: eventStartDate.toISOString(),
      end_date: eventEndDate.toISOString(),
      series_id: series.id,
      created_by: series.created_by,
      seats_remaining: template.seats_total,
    });

    // Calculate next occurrence
    if (frequency === 'daily') {
      currentDate.setDate(currentDate.getDate() + interval);
    } else if (frequency === 'weekly') {
      currentDate.setDate(currentDate.getDate() + (7 * interval));
    } else if (frequency === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + interval);
    }
  }

  return events;
}