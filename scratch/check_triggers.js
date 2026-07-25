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

async function checkTriggers() {
  console.log("=== CHECKING DB TRIGGERS & FUNCTIONS ===");
  // We can query pg_trigger via RPC or test trigger behavior
  // Let's test by inserting a temporary test saved_task and seeing if work_item is spawned!

  const testTitle = "TEMP_TEST_TRIGGER_RECURRING_" + Date.now();
  console.log(`Inserting test recurring template: "${testTitle}"...`);

  // Get active user ID
  const { data: users } = await supabaseAdmin.from('users').select('id').eq('is_active', true).limit(1);
  const testUserId = users[0]?.id;

  const { data: newSt, error: errSt } = await supabaseAdmin.from('saved_tasks').insert([{
    title: testTitle,
    description: "Temporary trigger test",
    assignee_id: testUserId,
    is_recurring: true,
    is_active: true,
    recurrence_rule: { type: 'daily', recurrence_mode: 'strict' }
  }]).select();

  if (errSt) {
    console.error("Error inserting test saved_task:", errSt);
    return;
  }

  const createdSt = newSt[0];
  console.log("Inserted test template ID:", createdSt.id);

  // Check if work_item was auto-spawned by trigger!
  const { data: spawnedItems, error: errWi } = await supabaseAdmin
    .from('work_items')
    .select('*')
    .eq('source_template_item_id', createdSt.id);

  console.log("Auto-spawned work_items for new template:", spawnedItems);

  // Clean up test saved_task and work_item
  await supabaseAdmin.from('work_items').delete().eq('source_template_item_id', createdSt.id);
  await supabaseAdmin.from('saved_tasks').delete().eq('id', createdSt.id);
  console.log("Cleaned up test template and spawned item.");
}

checkTriggers();
