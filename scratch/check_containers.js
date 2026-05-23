import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkContainers() {
  const { data, error } = await supabaseAdmin.from('containers').select('*').limit(1);
  if (error) {
    console.error("ERROR FETCHING CONTAINERS:", error);
  } else {
    console.log("CONTAINERS COLUMNS:", data && data[0] ? Object.keys(data[0]) : "No data or empty table");
    console.log("DATA RECORD:", data && data[0] ? data[0] : "None");
  }
}

checkContainers();
