/**
 * Date filtering utilities shared across all pages.
 */

/**
 * Returns { from: Date, to: Date } for the current filter setting.
 */
export function getDateRange(dateFilter, customDateRange) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateFilter === 'today') {
    const end = new Date(today); end.setHours(23, 59, 59, 999);
    return { from: today, to: end };
  }

  if (dateFilter === 'week') {
    const day = today.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    const from = new Date(today); from.setDate(today.getDate() + diff);
    const to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (dateFilter === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (dateFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
    const from = new Date(customDateRange.from); from.setHours(0, 0, 0, 0);
    const to = new Date(customDateRange.to); to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // default: no constraint
  return null;
}

/**
 * Returns true if the item falls within the current date range.
 * Items with no date are always included.
 */
export function isItemInDateRange(item, dateFilter, customDateRange) {
  const range = getDateRange(dateFilter, customDateRange);
  if (!range) return true;

  // Use expected_date if available, otherwise created_at
  const rawDate = item.expected_date || item.created_at;
  if (!rawDate) return true; // no date → always show

  const itemDate = new Date(rawDate);
  itemDate.setHours(0, 0, 0, 0);
  return itemDate >= range.from && itemDate <= range.to;
}

/** Human-readable label for the current filter */
export function getFilterLabel(dateFilter, customDateRange) {
  if (dateFilter === 'today') return 'Today';
  if (dateFilter === 'week') return 'This Week';
  if (dateFilter === 'month') return 'This Month';
  if (dateFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
    return `${customDateRange.from} → ${customDateRange.to}`;
  }
  return 'Custom';
}
