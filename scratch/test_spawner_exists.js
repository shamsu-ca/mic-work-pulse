import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.trim().startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.trim().startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkSpawner() {
  console.log("Checking if spawn_recurring_tasks_ist exists in DB...");
  const { data, error } = await supabaseAdmin.rpc('spawn_recurring_tasks_ist');
  if (error) {
    console.error("Function call returned error:", error);
  } else {
    console.log("Successfully verified function exists! Result:", data);
  }
}

checkSpawner().catch(console.error);
