import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkIntegrity() {
  console.log("=== INTEGRITY CHECK ===");

  const { data: users } = await supabaseAdmin.from('users').select('id, name');
  const { data: containers } = await supabaseAdmin.from('containers').select('id, title, type');
  const { data: workItems } = await supabaseAdmin.from('work_items').select('id, title, assignee_id, container_id, parent_id, source_template_item_id');
  const { data: savedContainers } = await supabaseAdmin.from('saved_containers').select('id, title');
  const { data: savedTasks } = await supabaseAdmin.from('saved_tasks').select('id, title, assignee_id, saved_container_id, parent_id');
  const { data: leaveRequests } = await supabaseAdmin.from('leave_requests').select('id, user_id');
  const { data: absences } = await supabaseAdmin.from('absences').select('id, user_id');
  const { data: announcements } = await supabaseAdmin.from('announcements').select('id, created_by');
  const { data: notifications } = await supabaseAdmin.from('notifications').select('id, user_id, work_item_id');
  const { data: archives } = await supabaseAdmin.from('archives').select('id, generated_by');

  const userIds = new Set((users || []).map(u => u.id));
  const containerIds = new Set((containers || []).map(c => c.id));
  const workItemIds = new Set((workItems || []).map(w => w.id));
  const savedContainerIds = new Set((savedContainers || []).map(c => c.id));
  const savedTaskIds = new Set((savedTasks || []).map(t => t.id));

  // Orphans checking helper
  const checkOrphans = (list, field, validSet, label) => {
    let orphans = 0;
    (list || []).forEach(item => {
      const val = item[field];
      if (val && !validSet.has(val)) {
        console.log(`Orphan in ${label} (ID: ${item.id}): field "${field}" value "${val}" does not exist in target.`);
        orphans++;
      }
    });
    return orphans;
  };

  console.log("Checking work_items...");
  const orphanWIAssignees = checkOrphans(workItems, 'assignee_id', userIds, 'work_items');
  const orphanWIContainers = checkOrphans(workItems, 'container_id', containerIds, 'work_items');
  const orphanWIParents = checkOrphans(workItems, 'parent_id', workItemIds, 'work_items');
  const orphanWITemplates = checkOrphans(workItems, 'source_template_item_id', savedTaskIds, 'work_items');

  console.log("Checking saved_tasks...");
  const orphanSavedTaskAssignees = checkOrphans(savedTasks, 'assignee_id', userIds, 'saved_tasks');
  const orphanSavedTaskContainers = checkOrphans(savedTasks, 'saved_container_id', savedContainerIds, 'saved_tasks');
  const orphanSavedTaskParents = checkOrphans(savedTasks, 'parent_id', savedTaskIds, 'saved_tasks');

  console.log("Checking leave_requests...");
  const orphanLeaveUsers = checkOrphans(leaveRequests, 'user_id', userIds, 'leave_requests');

  console.log("Checking absences...");
  const orphanAbsenceUsers = checkOrphans(absences, 'user_id', userIds, 'absences');

  console.log("Checking announcements...");
  const orphanAnnouncementsCreators = checkOrphans(announcements, 'created_by', userIds, 'announcements');

  console.log("Checking notifications...");
  const orphanNotificationUsers = checkOrphans(notifications, 'user_id', userIds, 'notifications');
  const orphanNotificationWI = checkOrphans(notifications, 'work_item_id', workItemIds, 'notifications');

  console.log("Checking archives...");
  const orphanArchiveCreators = checkOrphans(archives, 'generated_by', userIds, 'archives');

  console.log("Checking containers templates...");
  const orphanContainersTemplates = checkOrphans(containers, 'source_template_id', savedContainerIds, 'containers');

  console.log("\nSummary of Orphans:");
  console.log(`- work_items orphan assignees: ${orphanWIAssignees}`);
  console.log(`- work_items orphan containers: ${orphanWIContainers}`);
  console.log(`- work_items orphan parent tasks: ${orphanWIParents}`);
  console.log(`- work_items orphan templates: ${orphanWITemplates}`);
  console.log(`- saved_tasks orphan assignees: ${orphanSavedTaskAssignees}`);
  console.log(`- saved_tasks orphan containers: ${orphanSavedTaskContainers}`);
  console.log(`- saved_tasks orphan parents: ${orphanSavedTaskParents}`);
  console.log(`- leave_requests orphan users: ${orphanLeaveUsers}`);
  console.log(`- absences orphan users: ${orphanAbsenceUsers}`);
  console.log(`- announcements orphan creators: ${orphanAnnouncementsCreators}`);
  console.log(`- notifications orphan users: ${orphanNotificationUsers}`);
  console.log(`- notifications orphan tasks: ${orphanNotificationWI}`);
  console.log(`- archives orphan creators: ${orphanArchiveCreators}`);
  console.log(`- containers orphan templates: ${orphanContainersTemplates}`);
}

checkIntegrity().catch(console.error);
