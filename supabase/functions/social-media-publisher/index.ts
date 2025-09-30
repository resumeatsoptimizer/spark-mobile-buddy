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

    const { eventId, platforms, customContent } = await req.json();

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    const results = [];

    for (const platform of platforms) {
      // Get platform settings
      const { data: settings, error: settingsError } = await supabaseClient
        .from('integration_settings')
        .select('*')
        .eq('integration_type', platform)
        .eq('is_enabled', true)
        .single();

      if (settingsError || !settings) {
        console.log(`${platform} integration not configured, skipping`);
        continue;
      }

      // Generate post content
      const postContent = customContent?.[platform] || 
        `🎉 New Event: ${event.title}\n\n${event.description}\n\n📅 ${new Date(event.start_date).toLocaleDateString()}\n📍 ${event.location || 'TBA'}`;

      try {
        let postResult;

        if (platform === 'facebook') {
          // Facebook Graph API
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${settings.config.page_id}/feed`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: postContent,
                access_token: settings.access_token,
              }),
            }
          );

          postResult = await response.json();

          // Save to social_media_posts
          await supabaseClient.from('social_media_posts').insert({
            event_id: eventId,
            platform: 'facebook',
            post_content: postContent,
            post_id: postResult.id,
            post_url: `https://www.facebook.com/${postResult.id}`,
            status: 'posted',
            posted_at: new Date().toISOString(),
          });

        } else if (platform === 'twitter') {
          // Twitter API v2
          const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${settings.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: postContent.substring(0, 280), // Twitter character limit
            }),
          });

          postResult = await response.json();

          await supabaseClient.from('social_media_posts').insert({
            event_id: eventId,
            platform: 'twitter',
            post_content: postContent.substring(0, 280),
            post_id: postResult.data?.id,
            post_url: postResult.data?.id ? `https://twitter.com/i/status/${postResult.data.id}` : null,
            status: 'posted',
            posted_at: new Date().toISOString(),
          });

        } else if (platform === 'linkedin') {
          // LinkedIn API
          const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${settings.access_token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              author: `urn:li:person:${settings.config.person_id}`,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: postContent,
                  },
                  shareMediaCategory: 'NONE',
                },
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
              },
            }),
          });

          postResult = await response.json();

          await supabaseClient.from('social_media_posts').insert({
            event_id: eventId,
            platform: 'linkedin',
            post_content: postContent,
            post_id: postResult.id,
            status: 'posted',
            posted_at: new Date().toISOString(),
          });
        }

        results.push({ platform, success: true, result: postResult });

        // Log success
        await supabaseClient.from('integration_logs').insert({
          integration_type: platform,
          action: 'post',
          status: 'success',
          event_id: eventId,
          response_data: postResult,
        });

      } catch (platformError) {
        console.error(`Error posting to ${platform}:`, platformError);
        const errorMessage = platformError instanceof Error ? platformError.message : 'Unknown error';
        
        results.push({ platform, success: false, error: errorMessage });

        // Log error
        await supabaseClient.from('integration_logs').insert({
          integration_type: platform,
          action: 'post',
          status: 'failed',
          event_id: eventId,
          error_message: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Social media publisher error:', error);
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