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

    console.log('Checking for unpaid registrations');

    // Find unpaid registrations older than 2 hours
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: unpaidRegistrations, error: findError } = await supabase
      .from('registrations')
      .select('id, event_id, user_id, created_at, events(title, start_date)')
      .eq('status', 'confirmed')
      .eq('payment_status', 'unpaid')
      .lt('created_at', twoHoursAgo.toISOString());

    if (findError) {
      throw findError;
    }

    if (!unpaidRegistrations || unpaidRegistrations.length === 0) {
      return new Response(JSON.stringify({ message: 'No unpaid registrations to remind' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Found unpaid registrations:', unpaidRegistrations.length);

    let remindersScheduled = 0;
    let cancelled = 0;

    for (const registration of unpaidRegistrations) {
      const registrationAge = Date.now() - new Date(registration.created_at).getTime();
      const daysSinceRegistration = registrationAge / (1000 * 60 * 60 * 24);

      // Auto-cancel after 7 days
      if (daysSinceRegistration > 7) {
        const { error: cancelError } = await supabase
          .from('registrations')
          .update({ status: 'cancelled' })
          .eq('id', registration.id);

        if (!cancelError) {
          // Send cancellation email
          await supabase.functions.invoke('send-registration-email', {
            body: {
              emailData: {
                type: 'payment_cancelled',
                registrationId: registration.id,
                eventId: registration.event_id,
              }
            }
          });
          cancelled++;
        }
        continue;
      }

      // Schedule reminders at 1 day and 3 days if not already scheduled
      const reminderDays = [1, 3];
      
      for (const days of reminderDays) {
        if (daysSinceRegistration >= days) {
          // Check if reminder already sent
          const { data: existingTask } = await supabase
            .from('scheduled_tasks')
            .select('id')
            .eq('registration_id', registration.id)
            .eq('task_type', 'payment_reminder')
            .eq('metadata->reminder_day', days)
            .single();

          if (!existingTask) {
            // Schedule immediate reminder
            const { error: scheduleError } = await supabase
              .from('scheduled_tasks')
              .insert({
                task_type: 'payment_reminder',
                event_id: registration.event_id,
                registration_id: registration.id,
                scheduled_for: new Date().toISOString(),
                metadata: { reminder_day: days },
              });

            if (!scheduleError) {
              remindersScheduled++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      reminders_scheduled: remindersScheduled,
      cancelled: cancelled,
      message: `Scheduled ${remindersScheduled} reminder(s), cancelled ${cancelled} registration(s)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Payment reminder handler error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
