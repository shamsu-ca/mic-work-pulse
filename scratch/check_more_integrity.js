import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkMoreIntegrity() {
  const { data: savedTasks } = await supabaseAdmin.from('saved_tasks').select('*');
  const { data: savedContainers } = await supabaseAdmin.from('saved_containers').select('*');
  
  const tasksMap = new Map(savedTasks.map(t => [t.id, t]));
  const containersMap = new Map(savedContainers.map(c => [c.id, c]));

  console.log("=== SCANNING FOR INVALID PARENT / CONTAINER REFERENCES IN SAVED_TASKS ===");
  let invalidParents = 0;
  let invalidContainers = 0;
  let malformedRecurrence = 0;

  savedTasks.forEach(t => {
    // 1. Check parent_id
    if (t.parent_id && !tasksMap.has(t.parent_id)) {
      console.log(`Task ID: ${t.id} ("${t.title}") has INVALID parent_id: ${t.parent_id}`);
      invalidParents++;
    }

    // 2. Check saved_container_id
    if (t.saved_container_id && !containersMap.has(t.saved_container_id)) {
      console.log(`Task ID: ${t.id} ("${t.title}") has INVALID saved_container_id: ${t.saved_container_id}`);
      invalidContainers++;
    }

    // 3. Check recurrence rule structure
    if (t.is_recurring) {
      if (!t.recurrence_rule) {
        console.log(`Task ID: ${t.id} ("${t.title}") has is_recurring=true but recurrence_rule is NULL`);
        malformedRecurrence++;
      } else {
        const rule = t.recurrence_rule;
        const type = rule.type;
        if (!type) {
          console.log(`Task ID: ${t.id} ("${t.title}") has recurrence_rule missing "type"`);
          malformedRecurrence++;
        } else if (type === 'weekly') {
          // Check for either single day or weekly_days array
          if (rule.day === undefined && (!rule.weekly_days || !Array.isArray(rule.weekly_days))) {
            console.log(`Task ID: ${t.id} ("${t.title}") has weekly rule missing day and weekly_days:`, rule);
            malformedRecurrence++;
          }
        } else if (type === 'monthly') {
          if (rule.date === undefined && rule.monthly_day === undefined) {
            console.log(`Task ID: ${t.id} ("${t.title}") has monthly rule missing date and monthly_day:`, rule);
            malformedRecurrence++;
          }
        } else if (type === 'x_monthly') {
          if (rule.x_month_interval === undefined || rule.monthly_day === undefined) {
            console.log(`Task ID: ${t.id} ("${t.title}") has x_monthly rule missing interval or day:`, rule);
            malformedRecurrence++;
          }
        }
      }
    }
  });

  console.log("\n=== SCAN SUMMARY ===");
  console.log(`Invalid parents count: ${invalidParents}`);
  console.log(`Invalid containers count: ${invalidContainers}`);
  console.log(`Malformed/incomplete recurrence rules: ${malformedRecurrence}`);
}

checkMoreIntegrity().catch(console.error);
