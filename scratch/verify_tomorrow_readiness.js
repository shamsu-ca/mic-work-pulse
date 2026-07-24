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

async function simulateTomorrow() {
  const tomorrowIST = '2026-07-25'; // Tomorrow (Saturday)
  console.log(`=== SIMULATING RECURRING TASK SPAWN FOR TOMORROW (${tomorrowIST} IST) ===\n`);

  const { data: savedTasks } = await supabase
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true)
    .eq('is_active', true);

  const { data: users } = await supabase
    .from('users')
    .select('id, name, is_active')
    .eq('is_active', true);

  const activeUserMap = new Map((users || []).map(u => [u.id, u.name]));

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('status', 'Approved')
    .eq('leave_type', 'Full Day')
    .gte('to_date', tomorrowIST)
    .lte('from_date', tomorrowIST);

  const absentUserIds = new Set((leaves || []).map(l => l.user_id));

  let willSpawn = [];
  let skippedLeave = [];
  let notScheduled = [];

  const now = new Date(tomorrowIST + 'T00:00:00+05:30');
  const dayOfWeek = now.getDay(); // 6 = Saturday

  for (const template of savedTasks) {
    if (template.type === 'Group') continue;
    if (template.assignee_id && !activeUserMap.has(template.assignee_id)) continue;

    if (template.assignee_id && absentUserIds.has(template.assignee_id)) {
      skippedLeave.push(template);
      continue;
    }

    const rule = template.recurrence_rule;
    if (!rule) continue;

    let matchesRule = false;

    if (rule.type === 'daily') {
      matchesRule = true;
    } else if (rule.type === 'every_x_days' && rule.interval) {
      if (!template.last_generated_at) {
        matchesRule = true;
      } else {
        const lastGen = new Date(template.last_generated_at + 'T00:00:00+05:30');
        const diffDays = Math.floor((now - lastGen) / (1000 * 60 * 60 * 24));
        if (diffDays >= rule.interval) matchesRule = true;
      }
    } else if (rule.type === 'weekly') {
      if (Array.isArray(rule.weekly_days)) {
        if (rule.weekly_days.includes(dayOfWeek)) matchesRule = true;
      } else if (rule.day !== undefined) {
        if (dayOfWeek === rule.day) matchesRule = true;
      }
    } else if (rule.type === 'monthly') {
      const targetDay = rule.monthly_day || rule.date || 1;
      if (now.getDate() === targetDay) matchesRule = true;
    } else if (rule.type === 'x_monthly' || rule.type === 'every_x_months') {
      const interval = rule.x_month_interval || rule.interval || 1;
      const targetDay = rule.monthly_day || rule.date || 1;
      if (now.getDate() === targetDay) {
        if (!template.last_generated_at) {
          matchesRule = true;
        } else {
          const lastGen = new Date(template.last_generated_at + 'T00:00:00+05:30');
          const monthDiff = (now.getFullYear() - lastGen.getFullYear()) * 12 + (now.getMonth() - lastGen.getMonth());
          if (monthDiff >= interval) matchesRule = true;
        }
      }
    }

    if (matchesRule) {
      willSpawn.push({
        title: template.title,
        assignee: activeUserMap.get(template.assignee_id) || 'Unassigned',
        rule: rule.type
      });
    } else {
      notScheduled.push(template.title);
    }
  }

  console.log(`✅ WILL AUTOMATICALLY SPAWN TOMORROW (${tomorrowIST}) FOR ACTIVE USERS: Total ${willSpawn.length} tasks`);
  willSpawn.forEach((item, i) => {
    console.log(`  ${i + 1}. "${item.title}" -> Assignee: ${item.assignee} (Rule: ${item.rule})`);
  });

  if (skippedLeave.length > 0) {
    console.log(`\n⏸️ SKIPPED DUE TO APPROVED FULL-DAY LEAVE TOMORROW (${skippedLeave.length}):`);
    skippedLeave.forEach(t => console.log(`  - "${t.title}"`));
  }
}

simulateTomorrow();
