import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251002160000_fix_profiles_rls_for_admin.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration: 20251002160000_fix_profiles_rls_for_admin.sql');
    console.log('SQL:', sql);

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
