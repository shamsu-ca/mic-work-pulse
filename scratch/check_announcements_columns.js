import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkAnnouncements() {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('id, created_by, is_pinned')
    .limit(1);
    
  if (error) {
    console.log("Error selecting created_by or is_pinned from announcements:", error.message);
  } else {
    console.log("Success! Columns exist in database. Data:", data);
  }
}

checkAnnouncements().catch(console.error);
