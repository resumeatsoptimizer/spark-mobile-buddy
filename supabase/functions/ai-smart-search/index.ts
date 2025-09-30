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

    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all events
    const { data: events } = await supabaseClient
      .from('events')
      .select(`
        id, 
        title, 
        description, 
        start_date, 
        end_date,
        location,
        event_type,
        seats_remaining,
        event_category_mapping(event_categories(name)),
        event_tag_mapping(event_tags(name))
      `)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(100);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI for semantic search
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an intelligent event search assistant. Analyze the user's search query and match it with the most relevant events from the provided list. Consider:
- Natural language understanding (e.g., "tech events next week" or "cooking classes in Bangkok")
- Date preferences (e.g., "this weekend", "next month")
- Location preferences
- Event type and categories
- Semantic similarity

Return the top 10 most relevant events with relevance scores.`;

    const eventsData = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description?.slice(0, 200),
      date: e.start_date,
      location: e.location,
      type: e.event_type,
      categories: e.event_category_mapping?.map((c: any) => c.event_categories?.name),
      tags: e.event_tag_mapping?.map((t: any) => t.event_tags?.name)
    }));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Search query: "${query}"\n\nEvents database:\n${JSON.stringify(eventsData)}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'search_events',
            description: 'Return relevant events based on search query',
            parameters: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      eventId: { type: 'string' },
                      relevanceScore: { type: 'number', minimum: 0, maximum: 100 },
                      matchReason: { type: 'string' }
                    },
                    required: ['eventId', 'relevanceScore', 'matchReason']
                  }
                }
              },
              required: ['results']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'search_events' } }
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
    const searchResults = toolCall ? JSON.parse(toolCall.function.arguments).results : [];

    // Map results back to full event data
    const results = searchResults.map((result: any) => {
      const event = events.find(e => e.id === result.eventId);
      return {
        ...event,
        relevanceScore: result.relevanceScore,
        matchReason: result.matchReason
      };
    }).filter((r: any) => r.id);

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-smart-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
