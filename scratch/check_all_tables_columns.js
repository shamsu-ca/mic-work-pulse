import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const tables = [
  'containers',
  'saved_tasks',
  'saved_containers',
  'absences',
  'leave_requests',
  'announcements',
  'work_items',
  'users',
  'notifications'
];

async function checkAllTables() {
  for (const table of tables) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}': ERROR:`, error.message);
    } else {
      const cols = data && data[0] ? Object.keys(data[0]) : [];
      console.log(`Table '${table}' columns:`, cols);
    }
  }
}

checkAllTables().catch(console.error);
