import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkFkey() {
  const { data, error } = await supabaseAdmin.rpc('get_fkeys', {});
  // If get_fkeys RPC doesn't exist, we can use a direct SQL execution via Supabase if possible.
  // Wait, let's just query via system catalogs using a select if we have postgrest schema check, or execute a query.
  // Actually, we can run a select on informational views if exposed, or since we can't run arbitrary SQL directly via select without an RPC,
  // let's try querying information_schema if postgrest allows it, or let's use another method.
  // Let's see if we can query pg_catalog or information_schema.
  const { data: data2, error: err2 } = await supabaseAdmin
    .from('containers')
    .select('source_template_id')
    .limit(1);
  console.log('Query direct:', data2, err2);
}

// Alternatively, let's write a script that attempts to query schema using an SQL query in Supabase.
// Wait, is there a postgres function we can call? Let's check check_schema.js or test_db.js
checkFkey().catch(console.error);
