import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
  const { data, error } = await supabaseAdmin.from('work_items').select('*').limit(5);
  if (error) {
    console.error("Error fetching work_items:", error.message);
  } else {
    console.log("Work Items row keys:", data.length > 0 ? Object.keys(data[0]) : "No rows");
    // Print a row with its non-null values
    if (data.length > 0) {
      console.log("Sample Row:", data[0]);
    }
  }
}

checkCols().catch(console.error);
