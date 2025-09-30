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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, event_id, content, message_type, is_announcement } = await req.json();

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send') {
      // Verify user is registered for the event or is admin/staff
      const { data: registration } = await supabaseClient
        .from('registrations')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: userRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'staff'])
        .maybeSingle();

      if (!registration && !userRole) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to send messages to this event' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create message
      const { data: message, error: messageError } = await supabaseClient
        .from('event_messages')
        .insert({
          event_id,
          sender_id: user.id,
          content,
          message_type: message_type || 'text',
          is_announcement: is_announcement || false
        })
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      return new Response(
        JSON.stringify({ success: true, message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fetch') {
      // Fetch messages for an event
      const { data: messages, error: fetchError } = await supabaseClient
        .from('event_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            email,
            profiles (name, avatar_url)
          )
        `)
        .eq('event_id', event_id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchError) {
        throw fetchError;
      }

      return new Response(
        JSON.stringify({ success: true, messages }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in event messaging:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
