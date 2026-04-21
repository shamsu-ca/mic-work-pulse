import React from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';

const DATE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'lastmonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

const GROUP_OPTIONS = ['Office Staff', 'Institution'];

/**
 * Reusable filter bar.
 * Props:
 *   showToggle     {boolean} — show Office Staff / Institution toggle  (default true)
 *   showDateFilter {boolean} — show date filter                        (default true)
 */
export default function FilterBar({ showToggle = true, showDateFilter = true }) {
  const {
    staffGroup, setStaffGroup,
    dateFilter, setDateFilter,
    customDateRange, setCustomDateRange,
  } = useDataContext();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Group toggle */}
      {showToggle && (
        <div className="flex bg-surface-container rounded-xl border border-outline-variant/20 overflow-hidden">
          {GROUP_OPTIONS.map(g => (
            <button
              key={g}
              onClick={() => setStaffGroup(g)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                staffGroup === g
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Date filter - dropdown style box */}
      {showDateFilter && (
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="appearance-none bg-white border border-outline-variant/40 rounded-xl px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
          >
            {DATE_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
            arrow_drop_down
          </span>
        </div>
      )}

      {/* Custom date range inputs */}
      {showDateFilter && dateFilter === 'custom' && (
        <div className="flex items-center gap-2 bg-white border border-outline-variant/40 rounded-xl px-4 py-2 ml-2">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">calendar_month</span>
          <input
            type="date"
            value={customDateRange.from}
            onChange={e => setCustomDateRange({ ...customDateRange, from: e.target.value })}
            className="text-sm font-medium bg-transparent focus:outline-none text-on-surface w-32"
          />
          <span className="text-xs text-on-surface-variant">→</span>
          <input
            type="date"
            value={customDateRange.to}
            onChange={e => setCustomDateRange({ ...customDateRange, to: e.target.value })}
            className="text-sm font-medium bg-transparent focus:outline-none text-on-surface w-32"
          />
        </div>
      )}
    </div>
  );
}
