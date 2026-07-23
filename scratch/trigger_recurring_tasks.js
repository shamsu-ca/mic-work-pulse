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

async function generateRecurringTasks() {
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  console.log(`=== RECURRING TASK GENERATOR ===`);
  console.log(`Target Date (IST): ${todayIST}`);

  // Try RPC first
  console.log("Attempting RPC call 'spawn_recurring_tasks_ist'...");
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('spawn_recurring_tasks_ist');
  
  if (!rpcErr) {
    console.log("RPC 'spawn_recurring_tasks_ist' executed successfully!");
  } else {
    console.log(`RPC call returned: ${rpcErr.message}. Falling back to JS recurrence spawner...`);
  }

  // Also run client-side generator to ensure no tasks were missed
  const { data: savedTasks, error: errSaved } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true)
    .eq('is_active', true);

  if (errSaved) {
    console.error("Error fetching saved_tasks:", errSaved.message);
    return;
  }

  const { data: activeUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('is_active', true);
  const activeUserIds = new Set((activeUsers || []).map(u => u.id));

  const { data: leaves } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('status', 'Approved')
    .eq('leave_type', 'Full Day')
    .gte('to_date', todayIST)
    .lte('from_date', todayIST);

  const absentUserIds = new Set((leaves || []).map(l => l.user_id));

  let spawnedCount = 0;
  let skippedCount = 0;
  let alreadyGeneratedCount = 0;

  for (const template of savedTasks) {
    if (template.type === 'Group') continue;
    if (template.assignee_id && !activeUserIds.has(template.assignee_id)) continue;

    if (template.last_generated_at >= todayIST) {
      alreadyGeneratedCount++;
      continue;
    }

    if (template.assignee_id && absentUserIds.has(template.assignee_id)) {
      console.log(`Skipping template "${template.title}" (ID: ${template.id}) - Assignee on leave today.`);
      await supabaseAdmin.from('saved_tasks').update({ last_generated_at: todayIST }).eq('id', template.id);
      skippedCount++;
      continue;
    }

    const rule = template.recurrence_rule;
    if (!rule) continue;

    let shouldGenerate = false;
    const now = new Date(todayIST + 'T00:00:00+05:30');
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateOfMonth = now.getDate();

    if (rule.type === 'daily') {
      shouldGenerate = true;
    } else if (rule.type === 'every_x_days' && rule.interval) {
      if (!template.last_generated_at) {
        shouldGenerate = true;
      } else {
        const lastGen = new Date(template.last_generated_at + 'T00:00:00+05:30');
        const diffDays = Math.floor((now - lastGen) / (1000 * 60 * 60 * 24));
        if (diffDays >= rule.interval) shouldGenerate = true;
      }
    } else if (rule.type === 'weekly') {
      if (Array.isArray(rule.weekly_days)) {
        if (rule.weekly_days.includes(dayOfWeek)) shouldGenerate = true;
      } else if (rule.day !== undefined) {
        if (dayOfWeek === rule.day) shouldGenerate = true;
      }
    } else if (rule.type === 'monthly') {
      const targetDay = rule.monthly_day || rule.date || 1;
      if (dateOfMonth === targetDay) shouldGenerate = true;
    } else if (rule.type === 'x_monthly' || rule.type === 'every_x_months') {
      const interval = rule.x_month_interval || rule.interval || 1;
      const targetDay = rule.monthly_day || rule.date || 1;
      if (dateOfMonth === targetDay) {
        if (!template.last_generated_at) {
          shouldGenerate = true;
        } else {
          const lastGen = new Date(template.last_generated_at + 'T00:00:00+05:30');
          const monthDiff = (now.getFullYear() - lastGen.getFullYear()) * 12 + (now.getMonth() - lastGen.getMonth());
          if (monthDiff >= interval) shouldGenerate = true;
        }
      }
    }

    if (shouldGenerate) {
      // Check if work_item for today already exists
      const { data: existing } = await supabaseAdmin
        .from('work_items')
        .select('id')
        .eq('source_template_item_id', template.id)
        .eq('expected_date', todayIST)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error: insErr } = await supabaseAdmin.from('work_items').insert({
          title: template.title,
          description: template.description,
          type: 'Task',
          assignee_id: template.assignee_id,
          container_id: null,
          estimated_hours: template.estimated_hours,
          priority: template.priority || 'Medium',
          status: 'Assigned',
          expected_date: todayIST,
          is_recurring: false,
          parent_id: null,
          source_template_item_id: template.id
        });

        if (insErr) {
          console.error(`Failed to insert spawned task for template "${template.title}":`, insErr.message);
        } else {
          console.log(`[SPAWNED] Generated task: "${template.title}" (Date: ${todayIST})`);
          spawnedCount++;
        }
      }

      await supabaseAdmin.from('saved_tasks').update({ last_generated_at: todayIST }).eq('id', template.id);
    }
  }

  console.log(`\n=== SUMMARY FOR ${todayIST} ===`);
  console.log(`- Already Generated: ${alreadyGeneratedCount}`);
  console.log(`- Newly Spawned Tasks: ${spawnedCount}`);
  console.log(`- Skipped (on leave): ${skippedCount}`);
}

generateRecurringTasks();
