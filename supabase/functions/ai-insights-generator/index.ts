import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsightRequest {
  eventId?: string;
  insightType: 'prediction' | 'recommendation' | 'trend' | 'anomaly' | 'optimization';
  timeRange?: { start: string; end: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { eventId, insightType, timeRange }: InsightRequest = await req.json();

    console.log(`Generating ${insightType} insights for event: ${eventId || 'all'}`);

    // Fetch relevant data based on insight type
    let eventData, registrationData, analyticsData;

    if (eventId) {
      const { data: event } = await supabaseClient
        .from('events')
        .select('*, registrations(*)')
        .eq('id', eventId)
        .single();
      eventData = event;
    } else {
      const { data: events } = await supabaseClient
        .from('events')
        .select('*, registrations(*)');
      eventData = events;
    }

    // Fetch analytics data
    const { data: analytics } = await supabaseClient
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    analyticsData = analytics;

    // Prepare context for AI
    const context = {
      eventData,
      analyticsData,
      insightType,
      timeRange
    };

    // Call Lovable AI for insights generation
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
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
            content: `You are an advanced event analytics AI assistant. Analyze event data and provide actionable insights.
            Focus on ${insightType} insights. Provide specific, data-driven recommendations.
            Return insights in JSON format with: title, description, impact (high/medium/low), actionItems (array), metrics (object)`
          },
          {
            role: 'user',
            content: `Analyze this event data and provide ${insightType} insights:\n${JSON.stringify(context, null, 2)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insightContent = aiData.choices[0].message.content;
    
    let parsedInsight;
    try {
      parsedInsight = JSON.parse(insightContent);
    } catch {
      // If AI returns non-JSON, structure it
      parsedInsight = {
        title: `${insightType} Analysis`,
        description: insightContent,
        impact: 'medium',
        actionItems: [],
        metrics: {}
      };
    }

    // Store insight in database
    const { data: insight, error: insertError } = await supabaseClient
      .from('ai_insights')
      .insert({
        event_id: eventId || null,
        insight_type: insightType,
        insight_data: parsedInsight,
        confidence_score: 0.85,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Insight generated successfully:', insight.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        insight,
        analysis: parsedInsight 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in ai-insights-generator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
