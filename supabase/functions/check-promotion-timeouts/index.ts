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

    console.log('Checking for expired promotions');

    // Find expired promotions
    const { data: expiredRegistrations, error: findError } = await supabase
      .from('registrations')
      .select('id, event_id, user_id')
      .eq('status', 'pending')
      .not('promotion_expires_at', 'is', null)
      .lt('promotion_expires_at', new Date().toISOString());

    if (findError) {
      throw findError;
    }

    if (!expiredRegistrations || expiredRegistrations.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired promotions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Found expired promotions:', expiredRegistrations.length);

    let processedCount = 0;

    for (const registration of expiredRegistrations) {
      // Move back to waitlist
      const { error: waitlistError } = await supabase
        .from('waitlist')
        .insert({
          event_id: registration.event_id,
          user_id: registration.user_id,
        });

      if (waitlistError) {
        console.error('Error moving back to waitlist:', waitlistError);
        continue;
      }

      // Delete the expired registration
      const { error: deleteError } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registration.id);

      if (deleteError) {
        console.error('Error deleting expired registration:', deleteError);
        continue;
      }

      // Send notification email
      await supabase.functions.invoke('send-registration-email', {
        body: {
          emailData: {
            type: 'promotion_expired',
            registrationId: registration.id,
            eventId: registration.event_id,
          }
        }
      });

      processedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: processedCount,
      message: `Processed ${processedCount} expired promotion(s)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Check promotion timeouts error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
