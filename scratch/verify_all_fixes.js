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

async function verifyAllFixes() {
  console.log("=== VERIFYING TODAY FOCUS & TASK CREATION FIXES ===");

  const todayIST = "2026-07-25";

  // 1. Fetch all work_items for today
  const { data: workItems, error: errWi } = await supabaseAdmin
    .from('work_items')
    .select('*')
    .eq('expected_date', todayIST);

  if (errWi) {
    console.error("Error fetching work_items:", errWi);
    return;
  }

  const { data: users, error: errU } = await supabaseAdmin.from('users').select('*');
  const userMap = new Map((users || []).map(u => [u.id, u]));

  console.log(`Total work_items due for today (${todayIST}): ${workItems.length}`);

  // Test getTargetUserIds simulation for Admin user
  const shamsuddinHudawi = (users || []).find(u => u.name === "Shamsuddin Hudawi");
  console.log("\nTesting Shamsuddin Hudawi (Admin) tasks:");
  const shamsTasks = workItems.filter(w => w.assignee_id === shamsuddinHudawi.id);
  console.log(`Tasks assigned to Shamsuddin Hudawi due today: ${shamsTasks.length}`);
  shamsTasks.forEach((t, i) => {
    console.log(`  ${i+1}. [${t.status}] "${t.title}" (is_recurring: ${t.is_recurring}, created_at: ${t.created_at})`);
  });

  // Group today's tasks by assignee name
  console.log("\nToday's Focus Tasks Grouped By Assignee Name:");
  const grouped = {};
  workItems.forEach(w => {
    const uName = userMap.get(w.assignee_id)?.name || w.assignee_id || 'Unassigned';
    if (!grouped[uName]) grouped[uName] = [];
    grouped[uName].push(w.title);
  });

  Object.entries(grouped).forEach(([name, titles]) => {
    console.log(`- ${name} (${titles.length} tasks):`);
    titles.forEach(t => console.log(`    • "${t}"`));
  });
}

verifyAllFixes();
