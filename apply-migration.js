import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set');
  process.exit(1);
}

console.log('✅ Loaded Supabase credentials');
console.log('📍 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('\n🚀 Starting migration application...\n');

    // Read the migration file
    const migrationPath = join(__dirname, 'supabase/migrations/20251002160000_fix_profiles_rls_for_admin.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log('─────────────────────────────────────');
    console.log(sql);
    console.log('─────────────────────────────────────\n');

    // Execute the SQL directly using Supabase's REST API
    // We'll use the service role to execute this
    console.log('⏳ Executing migration...\n');

    const { data, error } = await supabase.rpc('exec_sql', {
      query: sql
    });

    if (error) {
      // If the RPC function doesn't exist, try direct query approach
      console.log('⚠️  exec_sql RPC not available, trying direct approach...\n');

      // Parse and execute the SQL statement
      const { error: createError } = await supabase.from('_migrations').select('*').limit(1);

      if (createError) {
        console.log('📝 Note: Using alternative method to apply migration\n');
      }

      // The migration needs to be applied through Supabase Dashboard
      console.log('❌ Cannot apply migration automatically through Supabase JS client');
      console.log('🔧 The anon/public key does not have permissions to modify database schema\n');
      console.log('📋 Please apply the migration manually through Supabase Dashboard:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new');
      console.log('   2. Copy the SQL above');
      console.log('   3. Paste and run it in the SQL Editor\n');
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    if (data) {
      console.log('📊 Result:', data);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

applyMigration();
