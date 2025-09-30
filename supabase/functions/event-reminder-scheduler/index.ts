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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { eventId } = await req.json();

    console.log('Scheduling event reminders for event:', eventId);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Get confirmed registrations
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('id, user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed');

    if (regError) {
      throw regError;
    }

    if (!registrations || registrations.length === 0) {
      return new Response(JSON.stringify({ message: 'No confirmed registrations found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const eventDate = new Date(event.start_date);
    const reminderTimes = [
      { days: 7, label: '7 days before' },
      { days: 1, label: '1 day before' },
      { hours: 2, label: '2 hours before' },
    ];

    let scheduledCount = 0;

    for (const registration of registrations) {
      for (const reminder of reminderTimes) {
        const scheduledFor = new Date(eventDate);
        
        if (reminder.days) {
          scheduledFor.setDate(scheduledFor.getDate() - reminder.days);
        } else if (reminder.hours) {
          scheduledFor.setHours(scheduledFor.getHours() - reminder.hours);
        }

        // Only schedule if in the future
        if (scheduledFor > new Date()) {
          const { error: insertError } = await supabase
            .from('scheduled_tasks')
            .insert({
              task_type: 'event_reminder',
              event_id: eventId,
              registration_id: registration.id,
              scheduled_for: scheduledFor.toISOString(),
              metadata: { reminder_type: reminder.label },
            });

          if (!insertError) {
            scheduledCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      scheduled: scheduledCount,
      message: `Scheduled ${scheduledCount} reminder(s) for ${registrations.length} registration(s)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Event reminder scheduler error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
