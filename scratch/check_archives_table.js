import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkArchives() {
  const { data, error } = await supabaseAdmin.from('archives').select('*').limit(1);
  if (error) {
    console.log("Archives table error:", error.message);
  } else {
    console.log("Archives table exists! Columns:", data[0] ? Object.keys(data[0]) : "No rows");
  }
}

checkArchives().catch(console.error);
