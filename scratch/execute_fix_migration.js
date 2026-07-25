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

async function applyFixes() {
  console.log("=== APPLYING RECURRING TASK FIXES & REASSIGNMENTS ===");

  const activeShamsuddinId = "0e29f529-1bfc-40d4-8285-c3750fee61b8"; // Shamsuddin Hudawi
  const activeSajidId = "14141942-5255-480a-9163-28a4c9836e72"; // Sajid Ibrahim

  // 1. Reassign Shamsuddin's 3 templates to Shamsuddin Hudawi
  console.log("1. Reassigning 3 templates from inactive Shamsuddin to active Shamsuddin Hudawi...");
  const { data: updatedShams, error: errShams } = await supabaseAdmin
    .from('saved_tasks')
    .update({ 
      assignee_id: activeShamsuddinId,
      last_generated_at: null // Clear so spawner picks them up for today if valid
    })
    .eq('assignee_id', '2f2f223f-ec90-4d1a-9c27-3354492f7d0b')
    .select();

  if (errShams) {
    console.error("Error updating Shamsuddin templates:", errShams);
  } else {
    console.log(`Reassigned ${updatedShams.length} templates to Shamsuddin Hudawi.`);
  }

  // 2. Reassign Naseef's template to Sajid Ibrahim
  console.log("2. Reassigning Naseef's template to Sajid Ibrahim...");
  const { data: updatedNaseef, error: errNaseef } = await supabaseAdmin
    .from('saved_tasks')
    .update({ 
      assignee_id: activeSajidId,
      last_generated_at: null
    })
    .eq('id', 'ae988e98-bfcb-4889-8a23-56e42ba7b69f')
    .select();

  if (errNaseef) {
    console.error("Error updating Naseef template:", errNaseef);
  } else {
    console.log(`Reassigned template "${updatedNaseef[0]?.title}" to Sajid Ibrahim.`);
  }

  // 3. Trigger spawn_recurring_tasks_ist RPC to generate tasks for today!
  console.log("3. Executing spawn_recurring_tasks_ist() RPC...");
  const { data: rpcRes, error: errRpc } = await supabaseAdmin.rpc('spawn_recurring_tasks_ist');
  if (errRpc) {
    console.error("Error executing RPC:", errRpc);
  } else {
    console.log("RPC executed successfully!");
  }

  // 4. Verify work items spawned for today
  const todayIST = "2026-07-25";
  const { data: spawnedItems } = await supabaseAdmin
    .from('work_items')
    .select('id, title, assignee_id, expected_date, created_at, source_template_item_id')
    .eq('expected_date', todayIST);

  const recurringToday = (spawnedItems || []).filter(i => i.source_template_item_id);
  console.log(`\nTotal recurring work_items spawned for ${todayIST}: ${recurringToday.length}`);
  recurringToday.forEach((item, idx) => {
    console.log(`  ${idx + 1}. "${item.title}" | Assignee: ${item.assignee_id} | Created: ${item.created_at}`);
  });
}

applyFixes();
