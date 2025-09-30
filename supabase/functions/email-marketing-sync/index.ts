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

    const { action, platform, eventId, registrationId } = await req.json();

    // Get platform settings
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

    if (platform === 'mailchimp') {
      const apiKey = settings.access_token;
      const dataCenter = apiKey.split('-')[1];
      const listId = settings.config.list_id;

      if (action === 'subscribe') {
        // Get registration details
        const { data: registration } = await supabaseClient
          .from('registrations')
          .select('*, profiles(*), events(*)')
          .eq('id', registrationId)
          .single();

        if (!registration) {
          throw new Error('Registration not found');
        }

        // Add subscriber to MailChimp
        const subscriberData = {
          email_address: registration.profiles.email,
          status: 'subscribed',
          merge_fields: {
            FNAME: registration.profiles.name?.split(' ')[0] || '',
            LNAME: registration.profiles.name?.split(' ').slice(1).join(' ') || '',
            EVENT: registration.events.title,
          },
          tags: [`event-${registration.event_id}`],
        };

        const response = await fetch(
          `https://${dataCenter}.api.mailchimp.com/3.0/lists/${listId}/members`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriberData),
          }
        );

        result = await response.json();

        await supabaseClient.from('integration_logs').insert({
          integration_type: 'mailchimp',
          action: 'subscribe',
          status: response.ok ? 'success' : 'failed',
          event_id: registration.event_id,
          response_data: result,
        });
      }

    } else if (platform === 'sendgrid') {
      const apiKey = settings.access_token;
      const listId = settings.config.list_id;

      if (action === 'subscribe') {
        const { data: registration } = await supabaseClient
          .from('registrations')
          .select('*, profiles(*), events(*)')
          .eq('id', registrationId)
          .single();

        if (!registration) {
          throw new Error('Registration not found');
        }

        // Add contact to SendGrid
        const contactData = {
          list_ids: [listId],
          contacts: [
            {
              email: registration.profiles.email,
              first_name: registration.profiles.name?.split(' ')[0] || '',
              last_name: registration.profiles.name?.split(' ').slice(1).join(' ') || '',
              custom_fields: {
                event_name: registration.events.title,
                event_id: registration.event_id,
              },
            },
          ],
        };

        const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contactData),
        });

        result = await response.json();

        await supabaseClient.from('integration_logs').insert({
          integration_type: 'sendgrid',
          action: 'subscribe',
          status: response.ok ? 'success' : 'failed',
          event_id: registration.event_id,
          response_data: result,
        });
      } else if (action === 'send_campaign') {
        // Send email campaign
        const { data: event } = await supabaseClient
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (!event) {
          throw new Error('Event not found');
        }

        const campaignData = {
          name: `Event Reminder: ${event.title}`,
          send_to: {
            list_ids: [listId],
          },
          email_config: {
            subject: `Reminder: ${event.title}`,
            html_content: settings.config.templates?.[action] || `<p>Don't forget about ${event.title}!</p>`,
            from: {
              email: settings.config.from_email,
              name: settings.config.from_name || 'Event Team',
            },
          },
        };

        const createResponse = await fetch('https://api.sendgrid.com/v3/marketing/singlesends', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignData),
        });

        const campaign = await createResponse.json();

        // Schedule send
        const sendResponse = await fetch(
          `https://api.sendgrid.com/v3/marketing/singlesends/${campaign.id}/schedule`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ send_at: 'now' }),
          }
        );

        result = await sendResponse.json();

        await supabaseClient.from('integration_logs').insert({
          integration_type: 'sendgrid',
          action: 'send_campaign',
          status: sendResponse.ok ? 'success' : 'failed',
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
    console.error('Email marketing sync error:', error);
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