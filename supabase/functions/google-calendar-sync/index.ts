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

    const { action, eventId, eventData } = await req.json();

    // Get Google Calendar settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('integration_type', 'google_calendar')
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Google Calendar integration not configured');
    }

    // Check if token needs refresh
    const tokenExpiresAt = new Date(settings.token_expires_at);
    let accessToken = settings.access_token;

    if (tokenExpiresAt <= new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: settings.config.client_id,
          client_secret: settings.config.client_secret,
          refresh_token: settings.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      await supabaseClient
        .from('integration_settings')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('integration_type', 'google_calendar');
    }

    let result;
    const calendarId = settings.config.calendar_id || 'primary';

    if (action === 'create') {
      // Create Google Calendar event
      const gcalEvent = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.start_date,
          timeZone: settings.config.timezone || 'Asia/Bangkok',
        },
        end: {
          dateTime: eventData.end_date,
          timeZone: settings.config.timezone || 'Asia/Bangkok',
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gcalEvent),
        }
      );

      result = await response.json();

      // Log success
      await supabaseClient.from('integration_logs').insert({
        integration_type: 'google_calendar',
        action: 'create',
        status: 'success',
        event_id: eventId,
        response_data: result,
      });

    } else if (action === 'update') {
      // Update Google Calendar event
      const gcalEventId = eventData.google_calendar_id;
      
      const gcalEvent = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.start_date,
          timeZone: settings.config.timezone || 'Asia/Bangkok',
        },
        end: {
          dateTime: eventData.end_date,
          timeZone: settings.config.timezone || 'Asia/Bangkok',
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gcalEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gcalEvent),
        }
      );

      result = await response.json();

      await supabaseClient.from('integration_logs').insert({
        integration_type: 'google_calendar',
        action: 'update',
        status: 'success',
        event_id: eventId,
        response_data: result,
      });

    } else if (action === 'delete') {
      const gcalEventId = eventData.google_calendar_id;

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gcalEventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      result = { success: true };

      await supabaseClient.from('integration_logs').insert({
        integration_type: 'google_calendar',
        action: 'delete',
        status: 'success',
        event_id: eventId,
      });
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Calendar sync error:', error);
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