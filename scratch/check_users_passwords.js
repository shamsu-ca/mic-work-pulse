import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkPasswords() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('username, name, password, is_active');

  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Current Users in DB:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkPasswords().catch(console.error);
