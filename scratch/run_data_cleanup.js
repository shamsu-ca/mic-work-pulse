import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
  console.log("Fetching active users...");
  const { data: users, error: errUsers } = await supabaseAdmin.from('users').select('id, name');
  if (errUsers) {
    console.error("Error fetching users:", errUsers);
    return;
  }
  const validUserIds = new Set(users.map(u => u.id));
  console.log(`Found ${users.length} active users.`);

  console.log("\nCleaning saved_tasks...");
  const { data: savedTasks, error: errTasks } = await supabaseAdmin.from('saved_tasks').select('id, title, assignee_id, created_by');
  if (errTasks) {
    console.error("Error fetching saved_tasks:", errTasks);
    return;
  }

  let cleanedTasksCount = 0;
  for (const task of savedTasks) {
    let needsUpdate = false;
    const updates = {};

    if (task.assignee_id && !validUserIds.has(task.assignee_id)) {
      console.log(`  - Task "${task.title}" (ID: ${task.id}) has orphan assignee_id: ${task.assignee_id}. Setting to NULL.`);
      updates.assignee_id = null;
      needsUpdate = true;
    }
    if (task.created_by && !validUserIds.has(task.created_by)) {
      console.log(`  - Task "${task.title}" (ID: ${task.id}) has orphan created_by: ${task.created_by}. Setting to NULL.`);
      updates.created_by = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateErr } = await supabaseAdmin.from('saved_tasks').update(updates).eq('id', task.id);
      if (updateErr) {
        console.error(`Failed to update task ${task.id}:`, updateErr);
      } else {
        cleanedTasksCount++;
      }
    }
  }
  console.log(`Cleaned ${cleanedTasksCount} tasks in saved_tasks.`);

  console.log("\nCleaning saved_containers...");
  const { data: savedContainers, error: errCont } = await supabaseAdmin.from('saved_containers').select('id, title, created_by');
  if (errCont) {
    console.error("Error fetching saved_containers:", errCont);
    return;
  }

  let cleanedContainersCount = 0;
  for (const container of savedContainers) {
    if (container.created_by && !validUserIds.has(container.created_by)) {
      console.log(`  - Container "${container.title}" (ID: ${container.id}) has orphan created_by: ${container.created_by}. Setting to NULL.`);
      const { error: updateErr } = await supabaseAdmin.from('saved_containers').update({ created_by: null }).eq('id', container.id);
      if (updateErr) {
        console.error(`Failed to update container ${container.id}:`, updateErr);
      } else {
        cleanedContainersCount++;
      }
    }
  }
  console.log(`Cleaned ${cleanedContainersCount} containers in saved_containers.`);
}

runCleanup().catch(console.error);
