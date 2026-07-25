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

async function liveCheckTodaySpawns() {
  const todayIST = "2026-07-25";
  console.log(`=======================================================`);
  console.log(`   LIVE RECURRING TASK CHECK FOR TODAY (${todayIST})   `);
  console.log(`=======================================================\n`);

  // 1. Fetch saved_tasks templates where is_recurring = true
  const { data: savedTasks, error: errSt } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true);

  if (errSt) {
    console.error("Error fetching saved_tasks:", errSt);
    return;
  }

  // 2. Fetch users
  const { data: users } = await supabaseAdmin.from('users').select('*');
  const userMap = new Map((users || []).map(u => [u.id, u]));

  // 3. Fetch spawned work_items for today (expected_date = todayIST)
  const { data: todayWorkItems, error: errWi } = await supabaseAdmin
    .from('work_items')
    .select('*')
    .eq('expected_date', todayIST);

  if (errWi) {
    console.error("Error fetching work_items:", errWi);
    return;
  }

  const spawnedMap = new Map();
  (todayWorkItems || []).forEach(wi => {
    if (wi.source_template_item_id) {
      spawnedMap.set(wi.source_template_item_id, wi);
    }
  });

  console.log(`Total Recurring Templates in DB: ${savedTasks.length}`);
  console.log(`Total Recurring Tasks Spawned for Today (${todayIST}): ${spawnedMap.size}\n`);

  console.log(`--- [SPAWNED RECURRING TASKS FOR TODAY (${todayIST})] ---`);
  let spawnedCount = 0;
  let unspawnedCount = 0;

  savedTasks.forEach((st, idx) => {
    const spawnedItem = spawnedMap.get(st.id);
    const assignee = userMap.get(st.assignee_id);
    const assigneeName = assignee ? `${assignee.name} (${assignee.role})` : 'Unassigned/Unknown';

    if (spawnedItem) {
      spawnedCount++;
      console.log(`✅ [SPAWNED #${spawnedCount}] Template: "${st.title}"`);
      console.log(`     Assignee: ${assigneeName}`);
      console.log(`     Rule: ${JSON.stringify(st.recurrence_rule)}`);
      console.log(`     WorkItem ID: ${spawnedItem.id} | Status: ${spawnedItem.status} | CreatedAt: ${spawnedItem.created_at}`);
      console.log(`-----------------------------------------------------------------------`);
    }
  });

  console.log(`\n--- [TEMPLATES NOT SPAWNED TODAY & REASON] ---`);
  savedTasks.forEach((st, idx) => {
    const spawnedItem = spawnedMap.get(st.id);
    const assignee = userMap.get(st.assignee_id);
    const assigneeName = assignee ? `${assignee.name} (Active: ${assignee.is_active})` : 'Unassigned';

    if (!spawnedItem) {
      unspawnedCount++;
      let reason = "Weekly rule not scheduled for Saturday (Day 6)";
      if (st.recurrence_rule?.type === 'weekly') {
        const ruleDays = st.recurrence_rule.weekly_days || [st.recurrence_rule.day];
        reason = `Weekly task configured for day(s): [${ruleDays.join(', ')}] (Today is Saturday = 6)`;
      } else if (!st.is_active) {
        reason = "Template is inactive";
      } else if (assignee && !assignee.is_active) {
        reason = `Assignee "${assignee.name}" is deactivated in users table`;
      }

      console.log(`ℹ️ [NOT SCHEDULED TODAY #${unspawnedCount}] Template: "${st.title}"`);
      console.log(`     Assignee: ${assigneeName}`);
      console.log(`     Rule: ${JSON.stringify(st.recurrence_rule)}`);
      console.log(`     Reason: ${reason}`);
      console.log(`-----------------------------------------------------------------------`);
    }
  });

  console.log(`\nSummary: ${spawnedCount} spawned out of ${savedTasks.length} total recurring templates.`);
}

liveCheckTodaySpawns();
