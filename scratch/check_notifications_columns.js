import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkNotifications() {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, work_item_id')
    .limit(1);
    
  if (error) {
    console.log("Error selecting work_item_id from notifications:", error.message);
  } else {
    console.log("Success! work_item_id exists in notifications table. Data:", data);
  }
}

checkNotifications().catch(console.error);
