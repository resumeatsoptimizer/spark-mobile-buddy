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

    console.log('Starting auto-promotion for event:', eventId);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, ticket_types(*)')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Check if waitlist is enabled
    if (!event.waitlist_enabled) {
      return new Response(JSON.stringify({ message: 'Waitlist not enabled for this event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Calculate available seats
    let availableSeats = event.seats_remaining;
    
    if (availableSeats <= 0) {
      return new Response(JSON.stringify({ message: 'No available seats' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get waitlist entries ordered by priority_score (if exists) then created_at
    const { data: waitlistEntries, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*, registrations!inner(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(availableSeats);

    if (waitlistError) {
      throw waitlistError;
    }

    if (!waitlistEntries || waitlistEntries.length === 0) {
      return new Response(JSON.stringify({ message: 'No waitlist entries to promote' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const promotedCount = Math.min(waitlistEntries.length, availableSeats);
    const promoteWindowHours = event.promote_window_hours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + promoteWindowHours);

    // Promote waitlist entries
    for (let i = 0; i < promotedCount; i++) {
      const entry = waitlistEntries[i];
      
      // Update registration to pending confirmation
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          status: 'pending',
          promoted_at: new Date().toISOString(),
          promotion_expires_at: expiresAt.toISOString(),
        })
        .eq('id', entry.registrations.id);

      if (updateError) {
        console.error('Error promoting registration:', updateError);
        continue;
      }

      // Remove from waitlist
      await supabase
        .from('waitlist')
        .delete()
        .eq('id', entry.id);

      // Send promotion email
      await supabase.functions.invoke('send-registration-email', {
        body: {
          emailData: {
            type: 'waitlist_promotion',
            registrationId: entry.registrations.id,
            eventId: eventId,
            expiresAt: expiresAt.toISOString(),
          }
        }
      });

      console.log('Promoted registration:', entry.registrations.id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      promoted: promotedCount,
      message: `Successfully promoted ${promotedCount} registration(s) from waitlist`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Auto-promotion error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
