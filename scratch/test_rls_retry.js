import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseServiceKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';" });
  
  if (error) {
    // If exec_sql RPC doesn't exist, let's try direct query if we can, or write a script that does it if possible.
    // Wait! Let's try executing via a simple postgres client since we are on Windows!
    // But we don't have connection string in .env.local, let's check if we can construct it.
    // The connection string format is usually postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
    // We don't have the db password.
    // But wait! Can we run it via postgres REST API by selecting from pg_tables?
    // Let's try:
    console.log("exec_sql RPC failed or not found:", error);
    
    // We can try calling supabase.from('pg_tables') or similar if exposed? No, it's in pg_catalog.
    // Let's try querying using postgres REST API directly by fetching pg_tables.
    const res = await supabaseAdmin.from('pg_catalog.pg_tables').select('*'); // This usually fails, but let's see.
    console.log("Direct catalog fetch error:", res.error);
  } else {
    console.log("RLS Status of tables:", data);
  }
}

test();
