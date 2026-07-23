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

async function checkRecurring() {
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  console.log(`=== RECURRING TASK VERIFICATION FOR TODAY (${todayIST}) ===\n`);

  // 1. Fetch all work_items generated for today (expected_date = todayIST) that originate from recurring templates
  const { data: todayItems, error: errItems } = await supabase
    .from('work_items')
    .select('id, title, status, assignee_id, expected_date, created_at, source_template_item_id')
    .eq('expected_date', todayIST);

  if (errItems) {
    console.error("Error fetching work_items:", errItems.message);
    return;
  }

  const recurringToday = (todayItems || []).filter(item => item.source_template_item_id != null);
  console.log(`Total work items with expected_date = ${todayIST}: ${todayItems.length}`);
  console.log(`Recurring tasks spawned for ${todayIST}: ${recurringToday.length}\n`);

  if (recurringToday.length > 0) {
    console.log("Details of spawned recurring tasks for today:");
    recurringToday.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.status}] "${item.title}" (Item ID: ${item.id}, Template ID: ${item.source_template_item_id})`);
    });
  }

  // 2. Fetch saved_tasks templates that have last_generated_at = todayIST
  const { data: templates, error: errT } = await supabase
    .from('saved_tasks')
    .select('id, title, is_recurring, is_active, recurrence_rule, last_generated_at')
    .eq('is_recurring', true)
    .eq('is_active', true);

  if (!errT && templates) {
    const processedToday = templates.filter(t => t.last_generated_at === todayIST);
    console.log(`\nActive Recurring Templates processed for ${todayIST}: ${processedToday.length} / ${templates.length}`);
    processedToday.forEach((t, idx) => {
      console.log(`  - Template #${idx + 1}: "${t.title}" (Rule: ${JSON.stringify(t.recurrence_rule)})`);
    });
  }
}

checkRecurring();
