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

    const { qr_data, station_id, device_info } = await req.json();

    if (!qr_data) {
      return new Response(
        JSON.stringify({ error: 'qr_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode QR data
    let qrInfo;
    try {
      qrInfo = JSON.parse(atob(qr_data));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid QR code data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { registration_id, event_id } = qrInfo;

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify registration exists and is confirmed
    const { data: registration, error: regError } = await supabaseClient
      .from('registrations')
      .select('id, event_id, status')
      .eq('id', registration_id)
      .eq('event_id', event_id)
      .single();

    if (regError || !registration) {
      return new Response(
        JSON.stringify({ error: 'Registration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (registration.status !== 'confirmed') {
      return new Response(
        JSON.stringify({ error: 'Registration is not confirmed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already checked in
    const { data: existingCheckIn } = await supabaseClient
      .from('event_check_ins')
      .select('id')
      .eq('registration_id', registration_id)
      .maybeSingle();

    if (existingCheckIn) {
      return new Response(
        JSON.stringify({ error: 'Already checked in', check_in: existingCheckIn }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create check-in record
    const { data: checkIn, error: checkInError } = await supabaseClient
      .from('event_check_ins')
      .insert({
        registration_id,
        event_id,
        checked_in_by: user.id,
        check_in_method: 'qr_code',
        station_id: station_id || null,
        device_info: device_info || {}
      })
      .select()
      .single();

    if (checkInError) {
      throw checkInError;
    }

    // Log audit trail
    await supabaseClient
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action_type: 'check_in',
        resource_type: 'registration',
        resource_id: registration_id,
        action_data: { event_id, station_id },
        severity: 'info'
      });

    return new Response(
      JSON.stringify({
        success: true,
        check_in: checkIn,
        message: 'Check-in successful'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error processing check-in:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
