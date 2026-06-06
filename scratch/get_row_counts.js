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
  'users',
  'containers',
  'saved_containers',
  'saved_tasks',
  'work_items',
  'notifications',
  'announcements',
  'absences',
  'leave_requests',
  'archives'
];

async function getRowCounts() {
  console.log("=== ROW COUNTS ===");
  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Table '${table}': ERROR: ${error.message}`);
    } else {
      console.log(`Table '${table}': ${count} records`);
    }
  }
}

getRowCounts().catch(console.error);
