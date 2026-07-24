import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUnspawned() {
  const { data: savedTasks } = await supabase.from('saved_tasks').select('*').eq('is_recurring', true).eq('is_active', true);
  const { data: users } = await supabase.from('users').select('*');
  const userMap = new Map((users || []).map(u => [u.id, u]));

  console.log("=== UNSPAWNED TEMPLATES DEBUG ===");
  savedTasks.forEach(t => {
    if (t.last_generated_at !== '2026-07-24') {
      const assignee = userMap.get(t.assignee_id);
      console.log(`\nTemplate ID: ${t.id}`);
      console.log(`Title: "${t.title}"`);
      console.log(`Last Generated At: ${t.last_generated_at}`);
      console.log(`Recurrence Rule:`, t.recurrence_rule);
      console.log(`Assignee ID: ${t.assignee_id} (${assignee ? `${assignee.name} [active: ${assignee.is_active}]` : 'User NOT FOUND'})`);
    }
  });
}

debugUnspawned();
