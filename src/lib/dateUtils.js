/**
 * Date filtering utilities shared across all pages.
 *
 * FILTER DEFINITIONS — all ranges end at today (no future data):
 *   today      : today → today
 *   this_week  : last Monday → today
 *   this_month : 1st of current month → today
 *   custom     : user-selected start → user-selected end
 */

/**
 * Returns { from: Date, to: Date } for the current filter setting.
 */
export function getDateRange(dateFilter, customDateRange) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (dateFilter === 'today') {
    return { from: todayStart, to: today };
  }

  // This week: last Monday → today
  if (dateFilter === 'this_week') {
    const from = new Date(todayStart);
    const day = from.getDay(); // 0 = Sun, 1 = Mon ...
    const diff = day === 0 ? 6 : day - 1; // days since last Monday
    from.setDate(from.getDate() - diff);
    return { from, to: today };
  }

  // This month: 1st of current month → today
  if (dateFilter === 'this_month') {
    const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    return { from, to: today };
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
  if (dateFilter === 'this_week') return 'This Week';
  if (dateFilter === 'this_month') return 'This Month';
  if (dateFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
    return `${customDateRange.from} → ${customDateRange.to}`;
  }
  return 'Custom';
}

/**
 * Returns a YYYY-MM-DD date string in Asia/Kolkata timezone (IST) from a Date object or parseable date input.
 */
export function getISTDateString(dateInput = new Date()) {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Adds 1 day to the given YYYY-MM-DD date string and returns the next date as YYYY-MM-DD in IST.
 */
export function getNextDayString(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return getISTDateString(d);
}

