/**
 * statusUtils.js
 * Status computation and utility functions.
 *
 * FINAL MODEL SPEC:
 * - Overdue: due_date < today AND not completed
 * - Not Started: status === 'Assigned' and not yet started (all unstarted assigned tasks)
 * - Assigned: display label for today's assignments only
 * - Ongoing: status === 'Ongoing'
 * - Completed: status === 'Completed'
 *
 * COUNTING:
 * Only count lowest-level actionable units:
 * - Subtask, Checklist, Milestone → always count
 * - Task → count only if no children (parent_id not set and no other items reference it)
 * - Project / Event → never count (containers only)
 */

/**
 * Checks if a date string is before today (YYYY-MM-DD format).
 */
export function isOverdue(item) {
  if (!item.expected_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(item.expected_date);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Gets the display status for an item.
 * - Completed always shows "Completed"
 * - Overdue shows when due date < today and not completed
 * - Ongoing shows when status is "Ongoing"
 * - Assigned shows as "Assigned" if created today, else "Not Started"
 */
export function getDisplayStatus(item) {
  if (!item) return '';

  if (item.status === 'Completed') return 'Completed';
  if (isOverdue(item)) return 'Overdue';
  if (item.status === 'Ongoing') return 'Ongoing';
  if (item.status === 'Assigned') {
    const today = new Date().toISOString().split('T')[0];
    const createdDay = item.created_at ? item.created_at.split('T')[0] : null;
    return createdDay === today ? 'Assigned' : 'Not Started';
  }
  return item.status || 'Not Started';
}

/**
 * Returns the CSS badge class for a given display status string.
 */
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
 * Determines if a work item is a lowest-level actionable unit.
 *
 * Countable types:
 * - Subtask, Checklist, Milestone → always count
 * - Task → count only if no children
 * - Project / Event → never count
 */
export function isLowestLevelActionableUnit(item, allItems = []) {
  const type = item.type?.toLowerCase();

  if (type === 'subtask' || type === 'checklist' || type === 'milestone') return true;
  if (type === 'project' || type === 'event' || type === 'phase') return false;

  if (type === 'task') {
    const hasChildren = allItems.some(other =>
      other.parent_id === item.id ||
      other.parentId === item.id ||
      other.container_id === item.id ||
      other.work_item_id === item.id
    );
    return !hasChildren;
  }

  return true;
}

/**
 * Counts actionable units in a list.
 */
export function countActionableUnits(items) {
  if (!items || !Array.isArray(items)) return 0;
  return items.filter(item => isLowestLevelActionableUnit(item, items)).length;
}

/**
 * Filters to only actionable units.
 */
export function getActionableUnits(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => isLowestLevelActionableUnit(item, items));
}
