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

    console.log('Checking for scheduled email tasks');

    const now = new Date().toISOString();

    // Find pending tasks that are due
    const { data: tasks, error: tasksError } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .in('task_type', ['event_reminder', 'payment_reminder'])
      .limit(50);

    if (tasksError) {
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No scheduled tasks due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Processing scheduled tasks:', tasks.length);

    let processedCount = 0;
    let failedCount = 0;

    for (const task of tasks) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_tasks')
          .update({ status: 'processing' })
          .eq('id', task.id);

        // Send email based on task type
        const emailType = task.task_type === 'event_reminder' ? 'event_reminder' : 'payment_reminder';
        
        const { error: emailError } = await supabase.functions.invoke('send-registration-email', {
          body: {
            emailData: {
              type: emailType,
              registrationId: task.registration_id,
              eventId: task.event_id,
              metadata: task.metadata,
            }
          }
        });

        if (emailError) {
          throw emailError;
        }

        // Mark as completed
        await supabase
          .from('scheduled_tasks')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        processedCount++;
      } catch (error) {
        console.error('Error processing task:', task.id, error);
        
        // Update retry count
        const newRetryCount = (task.retry_count || 0) + 1;
        const newStatus = newRetryCount >= 3 ? 'failed' : 'pending';
        
        await supabase
          .from('scheduled_tasks')
          .update({ 
            status: newStatus,
            retry_count: newRetryCount,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        failedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: processedCount,
      failed: failedCount,
      message: `Processed ${processedCount} task(s), ${failedCount} failed`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Scheduled email sender error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
