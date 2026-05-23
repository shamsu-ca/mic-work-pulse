import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  await supabaseAdmin.from('users').update({ username: 'superadmin' }).eq('id', '3be276e8-3837-43eb-b21e-3f7dbbbdbc05');
  const { data, error } = await supabaseAdmin.from('users').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkProfiles();
