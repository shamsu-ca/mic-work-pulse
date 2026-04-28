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

  // Last 7 days (including today)
  if (dateFilter === 'last7days') {
    const from = new Date(today);
    from.setDate(today.getDate() - 6); // 6 days back + today = 7 days total
    const to = new Date(today); to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // Last month (previous calendar month)
  if (dateFilter === 'lastmonth') {
    const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
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

/**
 * Format a YYYY-MM-DD date string as "Tue 28 Mar 2026".
 * Returns '—' for falsy input.
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Human-readable label for the current filter */
export function getFilterLabel(dateFilter, customDateRange) {
  if (dateFilter === 'today') return 'Today';
  if (dateFilter === 'last7days') return 'Last 7 Days';
  if (dateFilter === 'lastmonth') return 'Last Month';
  if (dateFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
    return `${customDateRange.from} → ${customDateRange.to}`;
  }
  return 'Custom';
}
