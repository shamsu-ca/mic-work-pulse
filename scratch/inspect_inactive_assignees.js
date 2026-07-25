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

async function inspectInactiveAssignees() {
  const { data: templates, error: errT } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true);

  if (errT) {
    console.error("Error fetching templates:", errT);
    return;
  }

  const { data: users, error: errU } = await supabaseAdmin.from('users').select('*');
  const userMap = new Map((users || []).map(u => [u.id, u]));

  console.log("=== TEMPLATES ASSIGNED TO INACTIVE OR UNMATCHED USERS ===");
  (templates || []).forEach(t => {
    const user = userMap.get(t.assignee_id);
    if (t.assignee_id && !user) {
      console.log(`[ORPHAN] Template "${t.title}" (ID: ${t.id}) has assignee_id ${t.assignee_id} which doesn't exist in users table!`);
    } else if (user && !user.is_active) {
      console.log(`[INACTIVE USER] Template "${t.title}" (ID: ${t.id}) is assigned to inactive user "${user.name}" (ID: ${user.id}). Last generated: ${t.last_generated_at}`);
    }
  });
}

inspectInactiveAssignees();
