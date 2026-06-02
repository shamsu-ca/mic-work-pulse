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
  const { data: inserted, error: insErr } = await supabaseAdmin.from('containers').insert({ title: 'TEMP TEST', type: 'Project' }).select();
  if (insErr) {
    console.error("Error inserting container:", insErr.message);
  } else {
    console.log("Container columns:", Object.keys(inserted[0]));
    // Clean up
    await supabaseAdmin.from('containers').delete().eq('id', inserted[0].id);
  }
}

checkCols().catch(console.error);
