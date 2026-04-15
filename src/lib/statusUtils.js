/**
 * statusUtils.js
 * Computes the display label for a work item's status.
 *
 * Logic:
 *   - If DB status is 'Assigned' AND created today → show "Assigned" (blue)
 *   - If DB status is 'Assigned' AND past creation day → show "Not Started" (amber)
 *   - All other statuses returned as-is
 */

export function getDisplayStatus(item) {
  if (!item) return '';
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const createdDay = item.created_at ? item.created_at.split('T')[0] : null;

  if (item.status === 'Assigned') {
    return createdDay === today ? 'Assigned' : 'Not Started';
  }
  return item.status || 'Not Started';
}

/**
 * Returns the CSS badge class for a given display status string.
 */
export function getStatusBadgeClass(displayStatus) {
  switch (displayStatus) {
    case 'Assigned':    return 'badge-info';
    case 'Not Started': return 'badge-warning';
    case 'Ongoing':     return 'badge-purple';
    case 'Completed':   return 'badge-success';
    case 'Overdue':     return 'badge-error';
    default:            return 'badge-warning';
  }
}
