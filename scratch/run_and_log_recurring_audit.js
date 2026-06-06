import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runRecurringAudit() {
  const logLines = [];
  const log = (msg) => {
    console.log(msg);
    logLines.push(msg);
  };

  log("=== FETCHING RECURRING TEMPLATES & USER DATA ===");
  
  const { data: users, error: errUsers } = await supabaseAdmin.from('users').select('*');
  if (errUsers) {
    log(`Error fetching users: ${errUsers.message}`);
    return;
  }
  const userMap = new Map(users.map(u => [u.id, u]));

  const { data: savedTasks, error: errTasks } = await supabaseAdmin
    .from('saved_tasks')
    .select('*')
    .eq('is_recurring', true);

  if (errTasks) {
    log(`Error fetching saved_tasks: ${errTasks.message}`);
    return;
  }

  const { data: leaves, error: errLeaves } = await supabaseAdmin.from('leave_requests').select('*');
  const leavesList = leaves || [];

  log(`\nFound ${savedTasks.length} recurring templates in saved_tasks:\n`);

  const todayStr = "2026-06-05"; // Local time from metadata
  const todayDateObj = new Date(todayStr + 'T00:00:00');
  const todayDayOfWeek = todayDateObj.getDay(); // 5 (Friday)
  const todayDayOfMonth = todayDateObj.getDate(); // 5

  const getLeaveOnDate = (userId, dateStr) => {
    if (!userId) return null;
    return leavesList.find(l => 
      l.user_id === userId && 
      l.status === 'Approved' && 
      dateStr >= l.from_date && dateStr <= l.to_date
    ) || null;
  };

  const getNextWorkingDay = (dateStr) => {
    let date = new Date(dateStr + 'T00:00:00');
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0); // Skip Sunday only
    return date.toISOString().split('T')[0];
  };

  const isScheduledDay = (dateObj, rule, template = {}) => {
    const day = dateObj.getDay();
    const date = dateObj.getDate();

    if (rule.type === 'daily') return true;
    if (rule.type === 'every_x_days' && rule.interval) {
      const lastDate = template.last_generated_at ? new Date(template.last_generated_at + 'T00:00:00') : new Date(template.created_at);
      const diffDays = Math.ceil(Math.abs(dateObj - lastDate) / (1000 * 60 * 60 * 24));
      return diffDays >= rule.interval;
    }
    if (rule.type === 'weekly') {
      if (Array.isArray(rule.weekly_days)) return rule.weekly_days.includes(day);
      return day === (rule.day !== undefined ? rule.day : 1);
    }
    if (rule.type === 'monthly') {
      const scheduledDate = rule.monthly_day || rule.date || 1;
      return date === scheduledDate;
    }
    if (rule.type === 'x_monthly' && rule.x_month_interval && rule.monthly_day) {
      const lastDate = template.last_generated_at ? new Date(template.last_generated_at + 'T00:00:00') : new Date(template.created_at);
      const monthDiff = (dateObj.getFullYear() - lastDate.getFullYear()) * 12 + (dateObj.getMonth() - lastDate.getMonth());
      return date === rule.monthly_day && monthDiff >= rule.x_month_interval;
    }
    if (rule.type === 'every_x_months' && rule.interval) {
      const lastDate = template.last_generated_at ? new Date(template.last_generated_at + 'T00:00:00') : new Date(template.created_at);
      const monthDiff = (dateObj.getFullYear() - lastDate.getFullYear()) * 12 + (dateObj.getMonth() - lastDate.getMonth());
      const scheduledDate = rule.date || 1;
      return date === scheduledDate && monthDiff >= rule.interval;
    }
    return false;
  };

  savedTasks.forEach((t, index) => {
    const assignee = userMap.get(t.assignee_id);
    const assigneeName = assignee ? assignee.name : (t.assignee_id ? "ORPHAN USER ID" : "Unassigned");
    
    log(`--- [Template #${index + 1}] ---`);
    log(`ID: ${t.id}`);
    log(`Title: "${t.title}"`);
    log(`Assignee ID: ${t.assignee_id || "None"}`);
    log(`Assignee Name: ${assigneeName}`);
    log(`Is Active: ${t.is_active}`);
    log(`Recurrence Rule: ${JSON.stringify(t.recurrence_rule)}`);
    log(`Last Generated At: ${t.last_generated_at || "Never"}`);
    log(`Created At: ${t.created_at}`);

    // Checks
    log("\n  * INTEGRITY CHECKS:");
    
    // 1. Orphan Assignee / Deleted User
    if (t.assignee_id && !assignee) {
      log("    - [!] ORPHAN ASSIGNEE: The assigned user ID does not exist in the users table (Deleted User).");
    } else {
      log("    - [OK] Assignee is valid.");
    }

    // 2. Invalid Recurrence Rule
    let isRuleValid = true;
    if (!t.recurrence_rule || typeof t.recurrence_rule !== 'object') {
      log("    - [!] INVALID RECURRENCE RULE: Rule is missing or is not a valid JSON object.");
      isRuleValid = false;
    } else {
      const validTypes = ['daily', 'every_x_days', 'weekly', 'monthly', 'every_x_months', 'x_monthly'];
      if (!validTypes.includes(t.recurrence_rule.type)) {
        log(`    - [!] INVALID RECURRENCE RULE: Type "${t.recurrence_rule.type}" is invalid.`);
        isRuleValid = false;
      }
    }
    if (isRuleValid) {
      log("    - [OK] Recurrence rule structure is valid.");
    }

    // 3. Last Generated At blocking generation
    if (t.last_generated_at && t.last_generated_at >= todayStr) {
      log(`    - [!] LAST_GENERATED_AT BLOCK: Already generated today or in the future (${t.last_generated_at}).`);
    } else {
      log("    - [OK] Not yet generated today.");
    }

    // 4. Recurrence Rule / Day mismatch
    if (isRuleValid && t.recurrence_rule.type === 'weekly') {
      const rule = t.recurrence_rule;
      if (rule.day !== undefined) {
        log(`    - Day Check: Configured to run on day ${rule.day} (Today is day ${todayDayOfWeek}).`);
      } else if (Array.isArray(rule.weekly_days)) {
        log(`    - Day Check: Configured to run on days [${rule.weekly_days.join(', ')}] (Today is day ${todayDayOfWeek}).`);
      }
    }

    // 5. Inactive templates
    if (!t.is_active) {
      log("    - [!] TEMPLATE INACTIVE: Generation is paused.");
    }

    // Trace execution for today (June 5, 2026)
    log("\n  * TRACE EXECUTION FOR TODAY (2026-06-05):");
    if (!t.is_active) {
      log("    - SKIPPED: Template is inactive.");
    } else if (t.assignee_id && !assignee) {
      log("    - SKIPPED: Assignee is a deleted/invalid user.");
    } else if (!isRuleValid) {
      log("    - SKIPPED: Recurrence rule is invalid.");
    } else {
      // Trace date loop
      let startDateStr = t.last_generated_at;
      let shouldCheck = true;
      
      if (!startDateStr) {
        if (t.recurrence_rule.type === 'daily') {
          log(`    - WOULD UPDATE: last_generated_at initialized to today (${todayStr}) (skipped generation for the first time).`);
          shouldCheck = false;
        } else {
          startDateStr = t.created_at.split('T')[0];
        }
      } else {
        const startDateObj = new Date(startDateStr + 'T00:00:00');
        startDateObj.setDate(startDateObj.getDate() + 1);
        startDateStr = startDateObj.toISOString().split('T')[0];
      }

      if (shouldCheck) {
        log(`    - Scanning dates from ${startDateStr} to ${todayStr}...`);
        let checkDateObj = new Date(startDateStr + 'T00:00:00');
        const todayObj = new Date(todayStr + 'T00:00:00');
        let generatedDates = [];
        let rescheduledDates = [];
        let skippedDates = [];

        while (checkDateObj <= todayObj) {
          const checkDateStr = checkDateObj.toISOString().split('T')[0];
          if (isScheduledDay(checkDateObj, t.recurrence_rule, t)) {
            const leave = getLeaveOnDate(t.assignee_id, checkDateStr);
            if (leave && leave.leave_type === 'Full Day') {
              if (t.recurrence_rule.type === 'daily') {
                skippedDates.push(`${checkDateStr} (Daily skipped due to leave)`);
              } else {
                const nextActiveDay = getNextWorkingDay(leave.to_date);
                if (todayStr >= nextActiveDay) {
                  generatedDates.push(`${checkDateStr} -> Rescheduled to ${nextActiveDay} and generated today`);
                } else {
                  rescheduledDates.push(`${checkDateStr} -> Pushed to ${nextActiveDay} (not today yet)`);
                }
              }
            } else {
              generatedDates.push(`${checkDateStr} (Generated normally)`);
            }
          }
          checkDateObj.setDate(checkDateObj.getDate() + 1);
        }

        if (generatedDates.length > 0) {
          log(`    - SUCCESS: Generated tasks on dates: ${JSON.stringify(generatedDates)}`);
        } else {
          log(`    - NO GENERATION TODAY:`);
          if (skippedDates.length > 0) log(`      * Skipped on leaves: ${JSON.stringify(skippedDates)}`);
          if (rescheduledDates.length > 0) log(`      * Rescheduled to future: ${JSON.stringify(rescheduledDates)}`);
          log(`      * Scheduled match for today (${todayStr})? ${isScheduledDay(todayObj, t.recurrence_rule, t)}`);
        }
      }
    }
    log("\n");
  });

  fs.writeFileSync('scratch/recurring_audit_result.log', logLines.join('\n'));
  log(`Audit results successfully written to scratch/recurring_audit_result.log`);
}

runRecurringAudit().catch(console.error);
