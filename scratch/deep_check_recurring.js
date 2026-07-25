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

async function deepCheckSummary() {
  const todayIST = "2026-07-25";
  console.log(`=== DETAILED ANALYSIS OF ALL RECURRING TEMPLATES FOR ${todayIST} ===\n`);

  const { data: savedTasks } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true);

  const { data: users } = await supabaseAdmin.from('users').select('*');
  const userMap = new Map((users || []).map(u => [u.id, u]));

  const { data: workItems } = await supabaseAdmin
    .from('work_items')
    .select('*')
    .eq('expected_date', todayIST);

  const { data: leaves } = await supabaseAdmin.from('leave_requests').select('*');
  const leavesList = leaves || [];

  console.log(`Total Templates: ${savedTasks.length}`);

  let unspawnedActiveTemplates = [];

  savedTasks.forEach((st, idx) => {
    const spawnedToday = (workItems || []).find(wi => wi.source_template_item_id === st.id);
    const assignee = userMap.get(st.assignee_id);
    const isUserActive = assignee ? assignee.is_active : false;
    const leaveToday = leavesList.find(l => 
      l.user_id === st.assignee_id && 
      l.status === 'Approved' && 
      l.leave_type === 'Full Day' &&
      todayIST >= l.from_date && todayIST <= l.to_date
    );

    if (!spawnedToday) {
      unspawnedActiveTemplates.push({
        idx: idx + 1,
        id: st.id,
        title: st.title,
        assigneeName: assignee ? assignee.name : 'Unknown/Unassigned',
        isUserActive,
        isTemplateActive: st.is_active,
        rule: st.recurrence_rule,
        last_generated_at: st.last_generated_at,
        leaveToday: !!leaveToday
      });
    }
  });

  console.log(`\nUnspawned Templates Count: ${unspawnedActiveTemplates.length}\n`);
  unspawnedActiveTemplates.forEach(t => {
    console.log(`Template #${t.idx}: "${t.title}" | Assignee: ${t.assigneeName} (User Active: ${t.isUserActive}) | Template Active: ${t.isTemplateActive} | Rule: ${JSON.stringify(t.rule)} | Last Gen: ${t.last_generated_at} | Leave Today: ${t.leaveToday}`);
  });

  console.log("\n=== USERS SUMMARY FOR TODAY'S SPAWNED TASKS ===");
  const spawnedUserCounts = {};
  (workItems || []).forEach(wi => {
    if (wi.source_template_item_id) {
      const uName = userMap.get(wi.assignee_id)?.name || wi.assignee_id || 'Unassigned';
      spawnedUserCounts[uName] = (spawnedUserCounts[uName] || 0) + 1;
    }
  });
  console.log("Spawned counts by user:", spawnedUserCounts);

  console.log("\n=== ALL ACTIVE USERS AND THEIR TEMPLATE COUNTS ===");
  (users || []).filter(u => u.is_active).forEach(u => {
    const uTemplates = savedTasks.filter(st => st.assignee_id === u.id && st.is_active);
    const uSpawnedToday = (workItems || []).filter(wi => wi.assignee_id === u.id && wi.source_template_item_id);
    console.log(`User: ${u.name} (id: ${u.id}) -> Active Templates: ${uTemplates.length}, Spawned Today: ${uSpawnedToday.length}`);
  });
}

deepCheckSummary();
