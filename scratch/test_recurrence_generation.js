import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Implement the same isAbsentFullDayToday and checkAndSpawnRecurringTasks logic
const checkAndSpawnRecurringTasks = async (savedTasksList, currentLeaves = []) => {
  const today = new Date().toISOString().split('T')[0];

  const isAbsentFullDayToday = (userId) => {
    if (!userId || !currentLeaves.length) return false;
    return currentLeaves.some(l => 
      l.user_id === userId && 
      l.status === 'Approved' && 
      l.leave_type === 'Full Day' && 
      today >= l.from_date && today <= l.to_date
    );
  };

  let spawnedParents = [];
  const templates = savedTasksList.filter(w => w.is_recurring && w.is_active && w.type !== 'Group');
  const candidateTemplates = [];

  for (const template of templates) {
    if (!template.recurrence_rule) continue;
    const lastGenerated = template.last_generated_at;
    if (lastGenerated === today) continue;
    
    // Skip spawn if assignee has Full-Day leave today
    if (isAbsentFullDayToday(template.assignee_id)) continue;

    const rule = template.recurrence_rule;
    let shouldGenerate = false;

    if (!lastGenerated) {
      shouldGenerate = true;
    } else {
      const lastDate = new Date(lastGenerated);
      const currentDate = new Date(today);
      const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (rule.type === 'daily') {
        if (diffDays >= 1) shouldGenerate = true;
      } else if (rule.type === 'every_x_days' && rule.interval) {
        if (diffDays >= rule.interval) shouldGenerate = true;
      } else if (rule.type === 'weekly' && rule.day !== undefined) {
        if (currentDate.getDay() === rule.day && diffDays >= 7) shouldGenerate = true;
      } else if (rule.type === 'monthly' && rule.date) {
        if (currentDate.getDate() === rule.date && currentDate.getMonth() !== lastDate.getMonth()) shouldGenerate = true;
      } else if (rule.type === 'every_x_months' && rule.interval) {
        const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 + (currentDate.getMonth() - lastDate.getMonth());
        if (monthDiff >= rule.interval) shouldGenerate = true;
      } else if (rule.type === 'weekly' && Array.isArray(rule.weekly_days)) {
        if (rule.weekly_days.includes(currentDate.getDay())) shouldGenerate = true;
      } else if (rule.type === 'monthly' && rule.monthly_day) {
        if (currentDate.getDate() === rule.monthly_day &&
            (currentDate.getFullYear() !== lastDate.getFullYear() ||
             currentDate.getMonth() !== lastDate.getMonth())) shouldGenerate = true;
      } else if (rule.type === 'x_monthly' && rule.x_month_interval && rule.monthly_day) {
        const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12
                        + (currentDate.getMonth() - lastDate.getMonth());
        if (currentDate.getDate() === rule.monthly_day && monthDiff >= rule.x_month_interval)
          shouldGenerate = true;
      }
    }

    if (shouldGenerate) candidateTemplates.push(template);
  }

  console.log(`Candidate templates to spawn today (${today}):`, candidateTemplates.map(t => `${t.title} (assignee_id: ${t.assignee_id})`));

  if (candidateTemplates.length > 0) {
    const candidateIds = candidateTemplates.map(t => t.id);
    console.log("Claiming templates in DB...");
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('saved_tasks')
      .update({ last_generated_at: today })
      .in('id', candidateIds)
      .or(`last_generated_at.is.null,last_generated_at.neq.${today}`)
      .select('id');

    if (claimErr) {
      console.error("Error updating saved_tasks last_generated_at:", claimErr);
      return [];
    }

    console.log("Claimed template IDs:", claimed?.map(c => c.id));

    if (claimed?.length) {
      const claimedIds = new Set(claimed.map(t => t.id));
      const claimedList = candidateTemplates.filter(t => claimedIds.has(t.id));

      const toInsert = claimedList.map(t => ({
        title: t.title, description: t.description, type: 'Task',
        assignee_id: t.assignee_id, container_id: null,
        estimated_hours: t.estimated_hours, priority: t.priority,
        status: 'Assigned', expected_date: today, is_recurring: false,
        parent_id: null,
      }));

      console.log("Inserting spawned tasks into work_items:", toInsert);
      const { data: insertedParents, error: insertErr } = await supabaseAdmin
        .from('work_items')
        .insert(toInsert)
        .select();

      if (insertErr) {
        console.error("Failed to spawn work_items. Database error details:", insertErr);
      } else {
        console.log("Successfully spawned work_items:", insertedParents);
        spawnedParents = insertedParents;
      }
    }
  }

  return spawnedParents;
};

async function runTest() {
  // Let's select one recurring task template and set its last_generated_at to a previous date
  // e.g. "Office Cleaning"
  const { data: templates } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('title', 'Office Cleaning')
    .eq('is_recurring', true)
    .limit(1);

  if (!templates || templates.length === 0) {
    console.log("No 'Office Cleaning' template found.");
    return;
  }

  const template = templates[0];
  console.log("Original template state:", template);

  // Set last_generated_at to yesterday in the database
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`Setting last_generated_at of template '${template.title}' to ${yesterday}...`);
  
  const { error: updateErr } = await supabaseAdmin
    .from('saved_tasks')
    .update({ last_generated_at: yesterday })
    .eq('id', template.id);

  if (updateErr) {
    console.error("Failed to update template:", updateErr);
    return;
  }

  // Refetch all templates to pass to generator
  const { data: allSavedTasks } = await supabaseAdmin.from('saved_tasks').select('*');
  const { data: allLeaves } = await supabaseAdmin.from('leave_requests').select('*');

  console.log("Running checkAndSpawnRecurringTasks...");
  await checkAndSpawnRecurringTasks(allSavedTasks, allLeaves);

  // Restore the original last_generated_at value
  console.log(`Restoring original last_generated_at to ${template.last_generated_at}...`);
  await supabaseAdmin
    .from('saved_tasks')
    .update({ last_generated_at: template.last_generated_at })
    .eq('id', template.id);
}

runTest().catch(console.error);
