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

    const systemPrompt = `You are an AI event creation assistant for Thailand-based events. Generate comprehensive event details in Thai language based on user input.

CRITICAL INSTRUCTIONS:
- Generate ALL responses in Thai language (except URLs and technical fields)
- Provide complete, ready-to-use event information
- Consider Thai cultural context, holidays, and business practices
- Use Thai Baht (THB) for pricing
- Suggest appropriate venues/platforms popular in Thailand

REQUIRED OUTPUT FOR ALL EVENT TYPES:
1. Title: Engaging, descriptive Thai event name (50-100 chars)
2. Description: Detailed Thai description with formatting (200-500 words)
3. Duration: Realistic hours and minutes based on event type
4. Capacity: Appropriate number of participants
5. Location: Specific venue name and address (for physical/hybrid)
6. Google Map URL: Real venue link (use popular Thai venues like QSNCC, Impact Arena, etc.)
7. Start/End Dates: Suggest optimal dates (weekends for public events, weekdays for corporate)
8. Registration Window: Open 2-4 weeks before, close 2-3 days before event
9. Ticket Types: At least 2 types with Thai pricing (Early Bird, Regular, VIP)
10. Waitlist Settings: Enable for popular events
11. Visibility: public (default), private (for corporate), invitation_only (for exclusive)
12. Categories: Thai event categories (เทคโนโลยี, ธุรกิจ, กีฬา, ศิลปะ, etc.)
13. Tags: Relevant Thai keywords
14. Marketing Tips: 3-5 actionable tips in Thai

EVENT TYPE SPECIFIC:
- Physical: Bangkok venues (QSNCC, Impact, CentralWorld, hotels)
- Virtual: Zoom, Microsoft Teams, Google Meet
- Hybrid: Combine both with streaming details

PRICING GUIDELINES:
- Free events: Community, education, charity
- Workshop/Training: 500-3,000 THB
- Seminars/Conferences: 1,000-5,000 THB
- Premium/VIP: 5,000-20,000 THB
- Concert/Festival: 800-5,000 THB`;

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
                  description: 'Engaging Thai event title (50-100 chars)'
                },
                description: { 
                  type: 'string',
                  description: 'Detailed Thai event description with formatting (200-500 words)'
                },
                eventLocation: {
                  type: 'string',
                  description: 'Specific venue name and address in Thai (for physical/hybrid events)'
                },
                googleMapUrl: {
                  type: 'string',
                  description: 'Google Maps URL of the venue (use real popular Thai venues)'
                },
                startDate: {
                  type: 'string',
                  description: 'Suggested start date and time in ISO format (YYYY-MM-DDTHH:mm:ss)'
                },
                endDate: {
                  type: 'string',
                  description: 'Suggested end date and time in ISO format (YYYY-MM-DDTHH:mm:ss)'
                },
                suggestedDuration: {
                  type: 'object',
                  properties: {
                    hours: { type: 'number', description: 'Duration in hours' },
                    minutes: { type: 'number', description: 'Additional minutes' }
                  },
                  required: ['hours', 'minutes']
                },
                suggestedCapacity: { 
                  type: 'number',
                  description: 'Recommended number of participants based on event type'
                },
                registrationOpenDate: {
                  type: 'string',
                  description: 'Registration open date (2-4 weeks before event) in ISO format'
                },
                registrationCloseDate: {
                  type: 'string',
                  description: 'Registration close date (2-3 days before event) in ISO format'
                },
                ticketTypes: {
                  type: 'array',
                  description: 'Array of ticket types with Thai names and THB pricing',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Ticket name in Thai (e.g., บัตรผู้เข้าชม, บัตร Early Bird, บัตร VIP)' },
                      price: { type: 'number', description: 'Price in Thai Baht (0 for free tickets)' },
                      seats: { type: 'number', description: 'Number of seats available for this ticket type' },
                      description: { type: 'string', description: 'Thai description of what this ticket includes' }
                    },
                    required: ['name', 'price', 'seats']
                  }
                },
                waitlistEnabled: {
                  type: 'boolean',
                  description: 'Enable waitlist for popular events (true for high-demand events)'
                },
                maxWaitlistSize: {
                  type: 'number',
                  description: 'Maximum waitlist size (typically 20-50% of capacity)'
                },
                visibility: {
                  type: 'string',
                  enum: ['public', 'private', 'invitation_only'],
                  description: 'Event visibility: public (default), private (corporate), invitation_only (exclusive)'
                },
                meetingPlatform: {
                  type: 'string',
                  description: 'Platform for virtual/hybrid events (Zoom, Google Meet, Microsoft Teams)'
                },
                customFields: {
                  type: 'array',
                  description: 'Relevant custom registration fields in Thai',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string', description: 'Field label in Thai' },
                      type: { type: 'string', enum: ['text', 'select', 'checkbox'] },
                      required: { type: 'boolean' },
                      options: { type: 'array', items: { type: 'string' }, description: 'Options in Thai for select fields' }
                    }
                  }
                },
                suggestedCategories: {
                  type: 'array',
                  description: 'Thai event categories (e.g., เทคโนโลยี, ธุรกิจ, กีฬา, ศิลปะ)',
                  items: { type: 'string' }
                },
                suggestedTags: {
                  type: 'array',
                  description: 'Relevant Thai keywords for search',
                  items: { type: 'string' }
                },
                marketingTips: {
                  type: 'array',
                  description: 'Actionable marketing tips in Thai (3-5 tips)',
                  items: { type: 'string' }
                }
              },
              required: ['title', 'description', 'suggestedDuration', 'suggestedCapacity', 'startDate', 'endDate', 'registrationOpenDate', 'registrationCloseDate', 'ticketTypes', 'visibility']
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
