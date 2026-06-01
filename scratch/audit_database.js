import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  const logLines = [];
  const log = (msg) => {
    console.log(msg);
    logLines.push(msg);
  };

  log("=== DATABASE RESET INTEGRITY AUDIT ===");

  // 1. Get users
  const { data: users, error: errUsers } = await supabaseAdmin.from('users').select('*');
  if (errUsers) {
    log(`Error fetching users: ${errUsers.message}`);
    return;
  }
  const userMap = new Map(users.map(u => [u.id, u]));
  log(`Total users found: ${users.length}`);
  users.forEach(u => {
    log(`  - User: ${u.name} (username: ${u.username}, id: ${u.id}, role: ${u.role}, active: ${u.is_active})`);
  });

  // 2. Get saved containers (project/event templates)
  const { data: savedContainers, error: errSavedCont } = await supabaseAdmin.from('saved_containers').select('*');
  if (errSavedCont) {
    log(`Error fetching saved_containers: ${errSavedCont.message}`);
    return;
  }
  const savedContMap = new Map(savedContainers.map(c => [c.id, c]));
  log(`\nTotal saved_containers (templates): ${savedContainers.length}`);
  savedContainers.forEach(c => {
    const creator = userMap.get(c.created_by);
    log(`  - Container Template ID: ${c.id}, Title: "${c.title}", Type: ${c.type}, Created By: ${c.created_by} (${creator ? creator.name : 'ORPHAN'})`);
  });

  // 3. Get saved_tasks (recurring templates + template items)
  const { data: savedTasks, error: errSavedTasks } = await supabaseAdmin.from('saved_tasks').select('*');
  if (errSavedTasks) {
    log(`Error fetching saved_tasks: ${errSavedTasks.message}`);
    return;
  }
  log(`\nTotal saved_tasks: ${savedTasks.length}`);

  let orphanAssignees = 0;
  let orphanContainers = 0;
  let orphanCreators = 0;
  let invalidRecurrenceRules = 0;
  let recurringTaskCount = 0;

  savedTasks.forEach(t => {
    const isRecurring = t.is_recurring;
    if (isRecurring) recurringTaskCount++;

    // Check assignee
    let assigneeName = 'None';
    let isAssigneeOrphan = false;
    if (t.assignee_id) {
      const u = userMap.get(t.assignee_id);
      if (u) {
        assigneeName = u.name;
      } else {
        assigneeName = 'ORPHAN';
        isAssigneeOrphan = true;
        orphanAssignees++;
      }
    }

    // Check container
    let containerTitle = 'None';
    let isContainerOrphan = false;
    if (t.saved_container_id) {
      const c = savedContMap.get(t.saved_container_id);
      if (c) {
        containerTitle = c.title;
      } else {
        containerTitle = 'ORPHAN';
        isContainerOrphan = true;
        orphanContainers++;
      }
    }

    // Check creator
    let creatorName = 'None';
    let isCreatorOrphan = false;
    if (t.created_by) {
      const u = userMap.get(t.created_by);
      if (u) {
        creatorName = u.name;
      } else {
        creatorName = 'ORPHAN';
        isCreatorOrphan = true;
        orphanCreators++;
      }
    }

    // Validate recurrence rule
    let ruleStr = 'None';
    let isRuleInvalid = false;
    if (isRecurring) {
      if (!t.recurrence_rule) {
        ruleStr = 'MISSING';
        isRuleInvalid = true;
        invalidRecurrenceRules++;
      } else {
        ruleStr = JSON.stringify(t.recurrence_rule);
        const type = t.recurrence_rule.type;
        const validTypes = ['daily', 'every_x_days', 'weekly', 'monthly', 'every_x_months', 'x_monthly'];
        if (!validTypes.includes(type)) {
          isRuleInvalid = true;
          invalidRecurrenceRules++;
        }
      }
    }

    if (isRecurring || isAssigneeOrphan || isContainerOrphan || isCreatorOrphan || isRuleInvalid) {
      log(`  - Task ID: ${t.id}, Title: "${t.title}", Type: ${t.type}`);
      log(`    * Assignee: ${t.assignee_id} (${assigneeName})${isAssigneeOrphan ? ' [ORPHAN!]' : ''}`);
      log(`    * Container: ${t.saved_container_id} (${containerTitle})${isContainerOrphan ? ' [ORPHAN!]' : ''}`);
      log(`    * Creator: ${t.created_by} (${creatorName})${isCreatorOrphan ? ' [ORPHAN!]' : ''}`);
      log(`    * Recurring: ${t.is_recurring}, Rule: ${ruleStr}${isRuleInvalid ? ' [INVALID RULE!]' : ''}`);
      log(`    * Status: ${t.status}, Active: ${t.is_active}, Last Gen: ${t.last_generated_at}`);
    }
  });

  log(`\n=== INTEGRITY METRICS ===`);
  log(`Total saved_tasks matching recurring: ${recurringTaskCount}`);
  log(`Orphan Assignee IDs in saved_tasks: ${orphanAssignees}`);
  log(`Orphan Saved Container IDs in saved_tasks: ${orphanContainers}`);
  log(`Orphan Creator IDs in saved_tasks: ${orphanCreators}`);
  log(`Invalid recurrence rules: ${invalidRecurrenceRules}`);

  // 4. Check active containers (live ones) for orphan references
  const { data: containers, error: errContainers } = await supabaseAdmin.from('containers').select('*');
  if (errContainers) {
    log(`Error fetching containers: ${errContainers.message}`);
  } else {
    log(`\nTotal active containers (projects/events): ${containers.length}`);
    let orphanContainerCreators = 0;
    let orphanSourceTemplates = 0;
    containers.forEach(c => {
      if (c.created_by && !userMap.has(c.created_by)) orphanContainerCreators++;
      if (c.source_template_id && !savedContMap.has(c.source_template_id)) orphanSourceTemplates++;
    });
    log(`Orphan Creators in containers: ${orphanContainerCreators}`);
    log(`Orphan source_template_ids in containers: ${orphanSourceTemplates}`);
  }

  // 5. Check work_items (live ones) for orphan references
  const { data: workItems, error: errWorkItems } = await supabaseAdmin.from('work_items').select('*');
  if (errWorkItems) {
    log(`Error fetching work_items: ${errWorkItems.message}`);
  } else {
    log(`\nTotal work_items: ${workItems.length}`);
    let orphanWIAssignees = 0;
    let orphanWICreators = 0;
    let orphanWIContainers = 0;
    let orphanWIParents = 0;
    const wiMap = new Map(workItems.map(w => [w.id, w]));

    workItems.forEach(w => {
      if (w.assignee_id && !userMap.has(w.assignee_id)) orphanWIAssignees++;
      if (w.created_by && !userMap.has(w.created_by)) orphanWICreators++;
      if (w.container_id && !containers.some(c => c.id === w.container_id)) orphanWIContainers++;
      if (w.parent_id && !wiMap.has(w.parent_id)) orphanWIParents++;
    });
    log(`Orphan Assignees in work_items: ${orphanWIAssignees}`);
    log(`Orphan Creators in work_items: ${orphanWICreators}`);
    log(`Orphan container_ids in work_items (not in active containers): ${orphanWIContainers}`);
    log(`Orphan parent_ids in work_items: ${orphanWIParents}`);
  }

  fs.writeFileSync('scratch/integrity_check.log', logLines.join('\n'));
  log(`\nSuccessfully wrote audit to scratch/integrity_check.log`);
}

runAudit().catch(console.error);
