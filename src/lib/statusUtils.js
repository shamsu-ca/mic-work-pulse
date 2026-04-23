/**
 * statusUtils.js — Status computation and phase-based counting.
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
 *
 * STATUS PRIORITY: Overdue > Not Started > Ongoing > Assigned > Completed
 */

const todayDateStr = () => new Date().toISOString().split('T')[0];

/** True if this phase item is currently active (date reached, not completed). */
export function isPhaseActive(phase) {
  if (!phase || phase.type !== 'Phase') return true; // non-phase items are always ok
  if (phase.status === 'Completed') return false;
  if (!phase.expected_date) return false; // template with no date → not active
  return phase.expected_date <= todayDateStr();
}

/** True if item's due date is before today and it is not completed. */
export function isOverdue(item) {
  if (!item.expected_date) return false;
  if (item.status === 'Completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(item.expected_date);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Display status for an item.
 * Priority: Completed > Overdue > Ongoing > Assigned/Not-Started
 */
export function getDisplayStatus(item) {
  if (!item) return '';
  if (item.status === 'Completed') return 'Completed';
  if (isOverdue(item)) return 'Overdue';
  if (item.status === 'Ongoing') return 'Ongoing';
  if (item.status === 'Assigned') {
    const today = todayDateStr();
    const createdDay = item.created_at ? item.created_at.split('T')[0] : null;
    return createdDay === today ? 'Assigned' : 'Not Started';
  }
  return item.status || 'Not Started';
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
 * - Project / Event / Phase → never count
 * - Subtask → always count
 * - Milestone → always count
 * - Checklist → count only if parent Phase is active (or no parent phase)
 * - Task → count only if it has no children AND (if under a phase) phase is active
 */
export function isLowestLevelActionableUnit(item, allItems = []) {
  const type = item.type?.toLowerCase();

  // Containers are never actionable units
  if (type === 'project' || type === 'event' || type === 'phase') return false;

  // Helper: resolve the nearest Phase ancestor (if any)
  const getNearestPhase = (itm) => {
    if (!itm.parent_id) return null;
    const parent = allItems.find(i => i.id === itm.parent_id);
    if (!parent) return null;
    if (parent.type === 'Phase') return parent;
    // Go one level up (checklist → task → phase)
    if (parent.parent_id) {
      const grandparent = allItems.find(i => i.id === parent.parent_id);
      if (grandparent?.type === 'Phase') return grandparent;
    }
    return null;
  };

  // Subtask — always count (subtasks live under tasks, not phases)
  if (type === 'subtask') return true;

  // Milestone — always count (they are project-level, no phase involvement)
  if (type === 'milestone') return true;

  // Checklist — count only if under an active phase (or standalone with no phase)
  if (type === 'checklist') {
    const phase = getNearestPhase(item);
    if (phase) return isPhaseActive(phase);
    return true; // standalone checklist → always count
  }

  // Task — count only if no children AND not under an inactive phase
  if (type === 'task') {
    const phase = getNearestPhase(item);
    if (phase && !isPhaseActive(phase)) return false;
    const hasChildren = allItems.some(other => other.parent_id === item.id);
    return !hasChildren;
  }

  return true;
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
