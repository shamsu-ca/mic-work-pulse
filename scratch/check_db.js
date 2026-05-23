import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkFkeys() {
  console.log("Checking foreign keys for table 'containers'...");
  const sql = `
    SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='containers';
  `;

  // We can query via RPC or we can use supabase.from().select() if there is a way, but since we don't have exec_sql RPC,
  // let's try calling supabaseAdmin.from('containers').select('source_template_id').limit(1);
  const { data, error } = await supabaseAdmin.from('containers').select('*').limit(1);
  console.log("Containers data check:", data, error);

  const { data: saved, error: savedErr } = await supabaseAdmin.from('saved_containers').select('*').limit(1);
  console.log("Saved Containers data check:", saved, savedErr);
}

checkFkeys();
