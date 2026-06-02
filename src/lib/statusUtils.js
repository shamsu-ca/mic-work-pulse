/**
 * statusUtils.js — Status computation and phase-based counting.
 *
 * STATUS FLOW: Assigned → Ongoing → Completed
 *
 * DISPLAY STATUS RULES:
 * - Completed : status === 'Completed'
 * - Overdue   : today > due_date AND status !== 'Completed'
 * - Ongoing   : status === 'Ongoing'
 * - Not Started: status === 'Assigned' AND today >= start_trigger AND today <= due_date
 *     Task / Subtask     → start_trigger = due_date - 1 day
 *     Milestone/Phase/Checklist → start_trigger = due_date
 * - Assigned  : status === 'Assigned' AND (no due_date OR today < start_trigger)
 *
 * COUNTING RULES (authoritative):
 * - Subtask, Checklist under ACTIVE phase, Milestone → count
 * - Task without children → count
 * - Task / Checklist under INACTIVE future phase → NOT counted
 * - Project, Event, Phase → never count (containers)
 *
 * PHASE ACTIVATION:
 * - Phase is ACTIVE when: phase.expected_date ≤ today AND phase.status !== 'Completed'
 * - Template phases (no date) are never auto-activated
 */

const todayDateStr = () => new Date().toISOString().split('T')[0];

/** True if this phase item is currently active (date reached, not completed). */
export function isPhaseActive(phase) {
  if (!phase || phase.type !== 'Phase') return true; // non-phase items are always ok
  if (phase.status === 'Completed') return false;
  if (!phase.expected_date) return false; // template with no date → not active
  return phase.expected_date <= todayDateStr();
}

/** True if item's due date is before today and it is not completed, unless user has approved full-day leave today. */
export function isOverdue(item, todayStr = todayDateStr(), _leaveRequests = []) {
  if (!item.expected_date) return false;
  if (item.status === 'Completed') return false;
  
  // Overdue: today > expected_date AND status != completed
  return todayStr > item.expected_date;
}

/**
 * True if an Assigned item enters "Not Started" today.
 * Rules:
 * - Task/Milestone: actionable on expected_date and one day before
 * - Checklist: actionable only on phase date (expected_date)
 * Do NOT show future items or overdue items.
 */
export function isNotStarted(item, todayStr = todayDateStr()) {
  if (item.status !== 'Assigned') return false;
  if (!item.expected_date) return false;

  const type = item.type?.toLowerCase();

  if (type === 'task' || type === 'milestone') {
    const due = new Date(item.expected_date + 'T00:00:00');
    const dayBefore = new Date(due);
    dayBefore.setDate(due.getDate() - 1);
    
    const dueStr = item.expected_date;
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    return todayStr === dueStr || todayStr === dayBeforeStr;
  } else if (type === 'checklist') {
    return todayStr === item.expected_date;
  }

  return false;
}

/**
 * Display status for an item.
 * Priority: Completed > Overdue > Ongoing > Not Started > Assigned
 */
export function getDisplayStatus(item, todayStr = todayDateStr(), leaveRequests = []) {
  if (!item) return '';
  if (item.status === 'Completed') return 'Completed';
  if (isOverdue(item, todayStr, leaveRequests)) return 'Overdue';
  if (item.status === 'Ongoing') return 'Ongoing';
  if (isNotStarted(item, todayStr)) return 'Not Started';
  return item.status || 'Assigned';
}

/** CSS badge classes per display status. */
export function getStatusBadgeClass(displayStatus) {
  switch (displayStatus) {
    case 'Assigned':    return 'bg-surface-container text-on-surface-variant';
    case 'Not Started': return 'bg-amber-100 text-amber-700';
    case 'Ongoing':     return 'bg-blue-100 text-blue-700';
    case 'Completed':   return 'bg-green-100 text-green-700';
    case 'Overdue':     return 'bg-red-100 text-red-700';
    default:            return 'bg-surface-container text-on-surface-variant';
  }
}

/**
 * Whether an item is the lowest-level actionable work unit.
 *
 * Rules:
 * - Project / Event / Phase → never count (containers)
 * - Subtask → deprecated (never count/exist)
 * - Milestone → always count
 * - Checklist → count only if active (under active phase or no phase)
 * - Task → always count (flat structure, no subtasks)
 */
export function isLowestLevelActionableUnit(item, allItems = []) {
  const type = item.type?.toLowerCase();

  // Containers are never actionable units
  if (type === 'project' || type === 'event' || type === 'phase' || type === 'plan' || item.in_planning_pool) return false;

  // Subtask - deprecated
  if (type === 'subtask') return false;

  // Milestone - always count
  if (type === 'milestone') return true;

  // Checklist - count if under active phase or standalone, or if completed
  if (type === 'checklist') {
    if (item.status === 'Completed') return true;
    if (!item.parent_id) return true;
    const parentPhase = allItems.find(i => i.id === item.parent_id);
    if (parentPhase && parentPhase.type === 'Phase') {
      return isPhaseActive(parentPhase) || parentPhase.status === 'Completed';
    }
    return true;
  }

  // Task - always count
  if (type === 'task') {
    if (item.status === 'Completed') return true;
    if (item.parent_id) {
      const parent = allItems.find(i => i.id === item.parent_id);
      if (parent && parent.type === 'Phase') {
        return isPhaseActive(parent) || parent.status === 'Completed';
      }
    }
    return true;
  }

  return false;
}

/** Count of actionable units in a list (phase-aware). */
export function countActionableUnits(items) {
  if (!items || !Array.isArray(items)) return 0;
  return items.filter(item => isLowestLevelActionableUnit(item, items)).length;
}

/** Filtered array of actionable units (phase-aware). */
export function getActionableUnits(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => isLowestLevelActionableUnit(item, items));
}

/**
 * Calculates user efficiency.
 * Formula:
 * Efficiency = (Early * 1 + OnTime * 1 + Late * 0.5) / Total Due Work * 100
 * where:
 * - Total Due Work = Completed + Overdue + Not Started
 * - Overdue = 0 score
 */
export function calculateUserEfficiency(tasks, leaveRequests = [], todayStr = todayDateStr()) {
  let totalDueWork = 0;
  let score = 0;

  tasks.forEach(t => {
    const ds = getDisplayStatus(t, todayStr, leaveRequests);
    
    if (ds === 'Completed') {
      totalDueWork++;
      if (t.expected_date && t.completed_at) {
        const expected = t.expected_date;
        const completedDate = new Date(t.completed_at).toISOString().split('T')[0];
        
        if (completedDate <= expected) {
          score += 1.0;
        } else {
          score += 0.5; // standard late penalty
        }
      } else {
        score += 1.0;
      }
    } else if (ds === 'Overdue') {
      totalDueWork++;
      score += 0.0;
    } else if (ds === 'Not Started') {
      totalDueWork++;
      score += 0.0;
    }
  });

  if (totalDueWork === 0) return 100;
  return Math.round((score / totalDueWork) * 100);
}
