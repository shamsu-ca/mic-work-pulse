import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testRPCs() {
  const candidates = [
    { name: 'exec_sql', params: { sql_query: 'SELECT 1;' } },
    { name: 'execute_sql', params: { sql_query: 'SELECT 1;' } },
    { name: 'run_sql', params: { sql_query: 'SELECT 1;' } },
    { name: 'exec_sql', params: { sql: 'SELECT 1;' } },
    { name: 'execute_sql', params: { sql: 'SELECT 1;' } },
    { name: 'run_sql', params: { sql: 'SELECT 1;' } },
    { name: 'exec_sql', params: { query: 'SELECT 1;' } },
    { name: 'execute_sql', params: { query: 'SELECT 1;' } }
  ];

  for (const c of candidates) {
    const { data, error } = await supabaseAdmin.rpc(c.name, c.params);
    if (!error) {
      console.log(`FOUND WORKING RPC: ${c.name} with params ${JSON.stringify(c.params)}. Result:`, data);
      return;
    } else {
      if (error.code !== 'PGRST202') {
        console.log(`Found RPC ${c.name} but got error:`, error);
        return;
      }
    }
  }
  console.log("No sql execution RPC found.");
}

testRPCs();
