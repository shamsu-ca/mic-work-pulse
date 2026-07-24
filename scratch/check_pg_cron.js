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

async function checkCron() {
  console.log("=== CHECKING PG_CRON AND RECURRING SPAWNER ===");

  // 1. Test RPC spawn_recurring_tasks_ist
  try {
    const { data, error } = await supabaseAdmin.rpc('spawn_recurring_tasks_ist');
    if (error) {
      console.error("Error executing spawn_recurring_tasks_ist RPC:", error);
    } else {
      console.log("RPC 'spawn_recurring_tasks_ist()' executed successfully!");
    }
  } catch (err) {
    console.error("Exception calling spawn_recurring_tasks_ist RPC:", err.message);
  }

  // 2. Check Postgres RPC version or custom SQL query via RPC if available
  // Let's check saved_tasks templates status for last_generated_at
  const { data: templates, error: errT } = await supabaseAdmin
    .from('saved_tasks')
    .select('id, title, is_recurring, is_active, recurrence_rule, last_generated_at')
    .eq('is_recurring', true)
    .eq('is_active', true);

  if (errT) {
    console.error("Error reading saved_tasks:", errT.message);
  } else {
    console.log(`\nActive Recurring Templates (${templates.length} total):`);
    templates.forEach(t => {
      console.log(`  - [${t.last_generated_at || 'Never'}] "${t.title}" (Rule: ${JSON.stringify(t.recurrence_rule)})`);
    });
  }
}

checkCron();
