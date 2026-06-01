import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

if (!supabaseUrl || !supabaseKey) {
  console.error("Failed to read Supabase URL or Service Role Key from .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function safeReset() {
  console.log("=== STARTING WORKPULSE SAFE RESET ===");

  // 1. Fetch active containers referencing templates and set source_template_id to null
  console.log("Disconnecting active containers from template IDs...");
  const { data: containers, error: fetchErr } = await supabaseAdmin
    .from('containers')
    .select('id, source_template_id');

  if (fetchErr) {
    console.error("Error fetching containers:", fetchErr.message);
  } else {
    const containersToUpdate = containers.filter(c => c.source_template_id !== null).map(c => c.id);
    if (containersToUpdate.length > 0) {
      console.log(`Updating ${containersToUpdate.length} containers to clear source_template_id...`);
      const { error: updateErr } = await supabaseAdmin
        .from('containers')
        .update({ source_template_id: null })
        .in('id', containersToUpdate);
      if (updateErr) {
        console.error("Failed to disconnect containers:", updateErr.message);
      } else {
        console.log("Successfully disconnected active containers.");
      }
    } else {
      console.log("No active containers were referencing templates.");
    }
  }

  // 2. Fetch all saved_tasks
  console.log("Fetching all templates from saved_tasks...");
  const { data: savedTasks, error: fetchTasksErr } = await supabaseAdmin
    .from('saved_tasks')
    .select('id, parent_id, title, type');

  if (fetchTasksErr) {
    console.error("Error fetching saved_tasks:", fetchTasksErr.message);
    return;
  }

  console.log(`Found ${savedTasks.length} saved_tasks in database.`);

  if (savedTasks.length > 0) {
    // Separate children (has parent_id) and parents (parent_id is null)
    // to avoid parent_id foreign key constraint violations during deletion
    const children = savedTasks.filter(t => t.parent_id !== null);
    const parents = savedTasks.filter(t => t.parent_id === null);

    if (children.length > 0) {
      const childIds = children.map(c => c.id);
      console.log(`Deleting ${childIds.length} child saved_tasks (checklists, grouped sub-templates)...`);
      const { error: delChildrenErr } = await supabaseAdmin
        .from('saved_tasks')
        .delete()
        .in('id', childIds);
      if (delChildrenErr) {
        console.error("Failed to delete child saved_tasks:", delChildrenErr.message);
      } else {
        console.log("Successfully deleted child saved_tasks.");
      }
    }

    const remainingParentIds = parents.map(p => p.id);
    if (remainingParentIds.length > 0) {
      console.log(`Deleting ${remainingParentIds.length} parent saved_tasks (recurring templates, phases, groups)...`);
      const { error: delParentsErr } = await supabaseAdmin
        .from('saved_tasks')
        .delete()
        .in('id', remainingParentIds);
      if (delParentsErr) {
        console.error("Failed to delete parent saved_tasks:", delParentsErr.message);
      } else {
        console.log("Successfully deleted parent saved_tasks.");
      }
    }
  }

  // 3. Delete saved_containers
  console.log("Fetching all saved_containers...");
  const { data: savedContainers, error: fetchContErr } = await supabaseAdmin
    .from('saved_containers')
    .select('id, title');

  if (fetchContErr) {
    console.error("Error fetching saved_containers:", fetchContErr.message);
  } else {
    console.log(`Found ${savedContainers.length} saved_containers.`);
    if (savedContainers.length > 0) {
      const contIds = savedContainers.map(c => c.id);
      console.log(`Deleting ${contIds.length} saved_containers (event templates)...`);
      const { error: delContErr } = await supabaseAdmin
        .from('saved_containers')
        .delete()
        .in('id', contIds);
      if (delContErr) {
        console.error("Failed to delete saved_containers:", delContErr.message);
      } else {
        console.log("Successfully deleted saved_containers.");
      }
    }
  }

  console.log("=== WORKPULSE SAFE RESET COMPLETED ===");
}

safeReset().catch(console.error);
