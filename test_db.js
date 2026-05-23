import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: workItems, error: errorWI } = await supabaseAdmin.from('work_items').select('*').limit(1);
  console.log("WORK_ITEMS COLUMNS:", workItems ? Object.keys(workItems[0] || {}) : "No data", errorWI);

  const { data: leaves, error: errorL } = await supabaseAdmin.from('leave_requests').select('*').limit(1);
  console.log("LEAVE_REQUESTS COLUMNS:", leaves ? Object.keys(leaves[0] || {}) : "No data", errorL);

  const { data: users, error: errorU } = await supabaseAdmin.from('users').select('*').limit(1);
  console.log("USERS COLUMNS:", users ? Object.keys(users[0] || {}) : "No data", errorU);
}

checkSchema();
