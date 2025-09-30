import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, eventType } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an AI event creation assistant. Generate comprehensive event details based on user input. Consider:
- Event type (physical, virtual, hybrid)
- Appropriate timing and duration
- Engaging descriptions
- Relevant custom fields
- Professional formatting
- SEO-friendly content`;

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
            content: `Create a detailed event based on: "${prompt}"\nEvent Type: ${eventType || 'physical'}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_event',
            description: 'Generate detailed event information',
            parameters: {
              type: 'object',
              properties: {
                title: { 
                  type: 'string',
                  description: 'Engaging event title (max 100 chars)'
                },
                description: { 
                  type: 'string',
                  description: 'Detailed event description with formatting'
                },
                suggestedDuration: {
                  type: 'object',
                  properties: {
                    hours: { type: 'number' },
                    minutes: { type: 'number' }
                  }
                },
                suggestedCapacity: { 
                  type: 'number',
                  description: 'Recommended number of participants'
                },
                customFields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      type: { type: 'string', enum: ['text', 'select', 'checkbox'] },
                      required: { type: 'boolean' },
                      options: { type: 'array', items: { type: 'string' } }
                    }
                  }
                },
                suggestedCategories: {
                  type: 'array',
                  items: { type: 'string' }
                },
                suggestedTags: {
                  type: 'array',
                  items: { type: 'string' }
                },
                marketingTips: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['title', 'description', 'suggestedDuration', 'suggestedCapacity']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_event' } }
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
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const eventData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ eventData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-event-creator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
