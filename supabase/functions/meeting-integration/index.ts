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

    const { action, eventId, platform, eventData } = await req.json();

    // Get meeting platform settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('integration_type', platform)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings) {
      throw new Error(`${platform} integration not configured`);
    }

    let result;

    if (platform === 'zoom') {
      // Zoom API integration
      const accessToken = settings.access_token;

      if (action === 'create') {
        const meetingData = {
          topic: eventData.title,
          type: 2, // Scheduled meeting
          start_time: eventData.start_date,
          duration: Math.ceil((new Date(eventData.end_date).getTime() - new Date(eventData.start_date).getTime()) / 60000),
          timezone: settings.config.timezone || 'Asia/Bangkok',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
          },
        };

        const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingData),
        });

        result = await response.json();

        // Update event with meeting details
        await supabaseClient
          .from('events')
          .update({
            meeting_url: result.join_url,
            meeting_id: result.id.toString(),
            meeting_platform: 'zoom',
          })
          .eq('id', eventId);

        await supabaseClient.from('integration_logs').insert({
          integration_type: 'zoom',
          action: 'create',
          status: 'success',
          event_id: eventId,
          response_data: result,
        });

      } else if (action === 'delete') {
        const meetingId = eventData.meeting_id;

        await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        await supabaseClient
          .from('events')
          .update({
            meeting_url: null,
            meeting_id: null,
            meeting_platform: null,
          })
          .eq('id', eventId);

        result = { success: true };

        await supabaseClient.from('integration_logs').insert({
          integration_type: 'zoom',
          action: 'delete',
          status: 'success',
          event_id: eventId,
        });
      }
    } else if (platform === 'teams') {
      // Microsoft Teams integration
      const accessToken = settings.access_token;

      if (action === 'create') {
        const meetingData = {
          subject: eventData.title,
          start: {
            dateTime: eventData.start_date,
            timeZone: settings.config.timezone || 'Asia/Bangkok',
          },
          end: {
            dateTime: eventData.end_date,
            timeZone: settings.config.timezone || 'Asia/Bangkok',
          },
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness',
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingData),
        });

        result = await response.json();

        await supabaseClient
          .from('events')
          .update({
            meeting_url: result.onlineMeeting?.joinUrl,
            meeting_id: result.id,
            meeting_platform: 'teams',
          })
          .eq('id', eventId);

        await supabaseClient.from('integration_logs').insert({
          integration_type: 'teams',
          action: 'create',
          status: 'success',
          event_id: eventId,
          response_data: result,
        });
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Meeting integration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});