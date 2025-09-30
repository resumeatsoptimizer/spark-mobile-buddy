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

    const { registration_id } = await req.json();

    if (!registration_id) {
      return new Response(
        JSON.stringify({ error: 'registration_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify registration exists
    const { data: registration, error: regError } = await supabaseClient
      .from('registrations')
      .select('id, event_id, user_id, status')
      .eq('id', registration_id)
      .single();

    if (regError || !registration) {
      return new Response(
        JSON.stringify({ error: 'Registration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate QR code data - use registration ID as the unique identifier
    const qrData = {
      registration_id: registration.id,
      event_id: registration.event_id,
      user_id: registration.user_id,
      timestamp: new Date().toISOString(),
      type: 'check-in'
    };

    const qrCodeData = btoa(JSON.stringify(qrData));

    return new Response(
      JSON.stringify({
        success: true,
        qr_data: qrCodeData,
        registration_id: registration.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating QR code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
