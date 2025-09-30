import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's interests and past registrations
    const { data: interests } = await supabaseClient
      .from('user_interests')
      .select('interest_tag')
      .eq('user_id', user.id);

    const { data: pastRegistrations } = await supabaseClient
      .from('registrations')
      .select('event_id, events(title, custom_fields)')
      .eq('user_id', user.id)
      .limit(10);

    // Fetch user behavior analytics
    const { data: behavior } = await supabaseClient
      .from('user_behavior_analytics')
      .select('action_type, event_id, action_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Build user profile for AI
    const userProfile = {
      interests: interests?.map(i => i.interest_tag) || [],
      pastEvents: pastRegistrations?.map(r => ({
        title: r.events?.title,
        fields: r.events?.custom_fields
      })) || [],
      recentActivity: behavior || []
    };

    // Fetch upcoming events
    const { data: upcomingEvents } = await supabaseClient
      .from('events')
      .select('id, title, description, start_date, custom_fields, event_category_mapping(event_categories(name)), event_tag_mapping(event_tags(name))')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(50);

    // Use Lovable AI to generate recommendations
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Based on this user profile:
Interests: ${userProfile.interests.join(', ')}
Past Events: ${JSON.stringify(userProfile.pastEvents.slice(0, 5))}

Recommend the top 5 most relevant events from this list:
${JSON.stringify(upcomingEvents?.slice(0, 20).map(e => ({
  id: e.id,
  title: e.title,
  description: e.description,
  categories: e.event_category_mapping?.map((c: any) => c.event_categories?.name),
  tags: e.event_tag_mapping?.map((t: any) => t.event_tags?.name)
})))}

Return the recommendations with reasoning.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an AI event recommendation engine. Analyze user preferences and suggest the most relevant events. Format your response as JSON with event IDs and brief reasoning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'recommend_events',
            description: 'Return recommended events with reasoning',
            parameters: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      eventId: { type: 'string' },
                      relevanceScore: { type: 'number', minimum: 0, maximum: 100 },
                      reasoning: { type: 'string' }
                    },
                    required: ['eventId', 'relevanceScore', 'reasoning']
                  }
                }
              },
              required: ['recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'recommend_events' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const recommendations = toolCall ? JSON.parse(toolCall.function.arguments).recommendations : [];

    // Map recommendations back to full event data
    const recommendedEvents = recommendations.map((rec: any) => {
      const event = upcomingEvents?.find(e => e.id === rec.eventId);
      return {
        ...event,
        relevanceScore: rec.relevanceScore,
        reasoning: rec.reasoning
      };
    }).filter((e: any) => e.id);

    return new Response(
      JSON.stringify({ recommendations: recommendedEvents }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-event-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
