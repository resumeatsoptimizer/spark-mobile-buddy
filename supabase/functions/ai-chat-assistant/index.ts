import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  context?: 'events' | 'analytics' | 'registrations' | 'general';
  conversationHistory?: Array<{ role: string; content: string }>;
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

    const { message, context = 'general', conversationHistory = [] }: ChatRequest = await req.json();

    console.log(`AI Chat Assistant - Context: ${context}, Message: ${message}`);

    // Fetch relevant data based on context
    let contextData: any = {};

    if (context === 'events') {
      const { data: events } = await supabaseClient
        .from('events')
        .select('id, title, start_date, seats_total, seats_remaining')
        .limit(50);
      contextData.events = events;
    } else if (context === 'analytics') {
      const { data: metrics } = await supabaseClient
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);
      contextData.metrics = metrics;
    } else if (context === 'registrations') {
      const { data: registrations } = await supabaseClient
        .from('registrations')
        .select('id, status, payment_status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      contextData.registrations = registrations;
    }

    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant for an event management platform. You help administrators manage events, understand analytics, and make data-driven decisions.
        
        Available context: ${context}
        Current data: ${JSON.stringify(contextData)}
        
        Provide helpful, actionable insights and recommendations. Be concise but thorough.
        If asked about specific metrics or data, reference the actual numbers from the context.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: assistantMessage,
        context: context
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in ai-chat-assistant:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
