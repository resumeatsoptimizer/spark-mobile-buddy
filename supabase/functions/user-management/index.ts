import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'staff' | 'participant';
}

interface UpdateRolesRequest {
  userId: string;
  role: string;
}

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some((r) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can manage users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'create' && req.method === 'POST') {
      const { email, password, name, role }: CreateUserRequest = await req.json();

      console.log(`Creating user with email: ${email}, role: ${role}`);

      // Create user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      console.log(`User created successfully: ${newUser.user.id}`);

      // Delete any existing role (e.g., from trigger) and insert the correct one
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id);

      // Assign single role
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        throw roleError;
      }

      console.log(`Role ${role} assigned successfully`);

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-roles' && req.method === 'POST') {
      const { userId, role }: UpdateRolesRequest = await req.json();

      console.log(`Updating role for user ${userId} to:`, role);

      // Delete existing role
      const { error: deleteError } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing role:', deleteError);
        throw deleteError;
      }

      console.log('Existing role deleted');

      // Insert new single role
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (roleError) {
        console.error('Error inserting new role:', roleError);
        throw roleError;
      }

      console.log(`Successfully assigned role: ${role}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete' && req.method === 'POST') {
      const { userId }: DeleteUserRequest = await req.json();

      console.log(`Deleting user: ${userId}`);

      // Try to delete user from auth
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        // If user not found in auth, they might already be deleted
        // Clean up orphaned records in public tables
        if (deleteError.status === 404 || deleteError.code === 'user_not_found') {
          console.log('User not found in auth, cleaning up related records');
          
          // Delete related records manually
          await supabaseClient.from('user_roles').delete().eq('user_id', userId);
          await supabaseClient.from('profiles').delete().eq('id', userId);
          
          console.log('Cleanup completed for non-existent user');
          
          return new Response(
            JSON.stringify({ success: true, message: 'User records cleaned up' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.error('Error deleting user:', deleteError);
        throw deleteError;
      }

      console.log('User deleted successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
