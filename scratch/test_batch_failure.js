import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function verifyBatchRollback() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Let's find two templates: e.g. "Office Cleaning" (valid assignee) and "പള്ളി Cleaning" (orphan assignee: 97afa798-0bdf-48a7-8aa8-96a0727b5c04)
  const { data: t1 } = await supabaseAdmin.from('saved_tasks').select('*').eq('title', 'Office Cleaning').limit(1);
  const { data: t2 } = await supabaseAdmin.from('saved_tasks').select('*').eq('title', 'പള്ളി Cleaning').limit(1);

  if (!t1?.length || !t2?.length) {
    console.error("Could not find required test templates");
    return;
  }

  const validTemplate = t1[0];
  const invalidTemplate = t2[0];

  console.log("Valid template before:", { id: validTemplate.id, assignee_id: validTemplate.assignee_id, last_generated_at: validTemplate.last_generated_at });
  console.log("Invalid template before:", { id: invalidTemplate.id, assignee_id: invalidTemplate.assignee_id, last_generated_at: invalidTemplate.last_generated_at });

  // Update both to yesterday
  await supabaseAdmin.from('saved_tasks').update({ last_generated_at: yesterday }).in('id', [validTemplate.id, invalidTemplate.id]);

  // Simulate spawn logic
  const candidateTemplates = [validTemplate, invalidTemplate];
  const candidateIds = candidateTemplates.map(t => t.id);

  console.log("\nUpdating last_generated_at to today in DB...");
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from('saved_tasks')
    .update({ last_generated_at: today })
    .in('id', candidateIds)
    .or(`last_generated_at.is.null,last_generated_at.neq.${today}`)
    .select('id');

  if (claimErr) {
    console.error("Update error:", claimErr);
    return;
  }
  console.log("Claimed template IDs:", claimed?.map(c => c.id));

  // Try insert
  const toInsert = candidateTemplates.map(t => ({
    title: t.title,
    description: t.description,
    type: 'Task',
    assignee_id: t.assignee_id,
    container_id: null,
    estimated_hours: t.estimated_hours,
    priority: t.priority,
    status: 'Assigned',
    expected_date: today,
    is_recurring: false,
    parent_id: null,
  }));

  console.log("Inserting spawned tasks...");
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('work_items')
    .insert(toInsert)
    .select();

  if (insertErr) {
    console.error("Insert failed as expected! Error details:", insertErr.message, insertErr.details);
  } else {
    console.log("Insert succeeded unexpectedly:", inserted);
  }

  // Check database state after transaction
  const { data: check1 } = await supabaseAdmin.from('saved_tasks').select('id, title, last_generated_at').eq('id', validTemplate.id);
  const { data: check2 } = await supabaseAdmin.from('saved_tasks').select('id, title, last_generated_at').eq('id', invalidTemplate.id);
  console.log("\nSaved Tasks state after failure:", check1[0], check2[0]);

  // Clean up: restore original values
  await supabaseAdmin.from('saved_tasks').update({ last_generated_at: validTemplate.last_generated_at }).eq('id', validTemplate.id);
  await supabaseAdmin.from('saved_tasks').update({ last_generated_at: invalidTemplate.last_generated_at }).eq('id', invalidTemplate.id);
}

verifyBatchRollback().catch(console.error);
