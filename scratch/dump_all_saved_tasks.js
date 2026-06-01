import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function dump() {
  const { data: savedTasks, error } = await supabaseAdmin.from('saved_tasks').select('*');
  if (error) {
    console.error(error);
    return;
  }

  console.log(`=== DUMPING ALL ${savedTasks.length} RECORDS FROM SAVED_TASKS ===`);
  const counts = {};
  savedTasks.forEach(t => {
    counts[t.type] = (counts[t.type] || 0) + 1;
    console.log(`ID: ${t.id} | Title: "${t.title}" | Type: ${t.type} | IsRecurring: ${t.is_recurring} | ParentID: ${t.parent_id} | ContainerID: ${t.saved_container_id} | AssigneeID: ${t.assignee_id} | Rule: ${JSON.stringify(t.recurrence_rule)} | LastGen: ${t.last_generated_at}`);
  });

  console.log("\n=== SUMMARY BY TYPE ===");
  console.log(counts);
}

dump().catch(console.error);
