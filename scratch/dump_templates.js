import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function inspectAllTemplates() {
  const { data: savedTasks, error } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Total saved_tasks: ${savedTasks.length}\n`);
  savedTasks.forEach(st => {
    console.log(`ID: ${st.id}`);
    console.log(`Title: ${st.title}`);
    console.log(`Active: ${st.is_active}`);
    console.log(`Assignee ID: ${st.assignee_id}`);
    console.log(`Recurrence Rule: ${JSON.stringify(st.recurrence_rule)}`);
    console.log(`Last Generated At: ${st.last_generated_at}`);
    console.log(`Created At: ${st.created_at}`);
    console.log('--------------------------------------------------');
  });
}

inspectAllTemplates();
