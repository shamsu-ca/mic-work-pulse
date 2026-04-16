import React from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';

const DATE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom',label: 'Custom' },
];

const GROUP_OPTIONS = ['Office Staff', 'Institution'];

/**
 * Reusable filter bar. 
 * Props:
 *   showToggle     {boolean} — show Office Staff / Institution toggle  (default true)
 *   showDateFilter {boolean} — show date pill filter                   (default true)
 */
export default function FilterBar({ showToggle = true, showDateFilter = true }) {
  const {
    staffGroup, setStaffGroup,
    dateFilter, setDateFilter,
    customDateRange, setCustomDateRange,
  } = useDataContext();

  const pillBase = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap';
  const pillActive = 'bg-white text-primary shadow-sm';
  const pillInactive = 'text-on-surface-variant hover:text-on-surface';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Group toggle */}
      {showToggle && (
        <div className="flex gap-0.5 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
          {GROUP_OPTIONS.map(g => (
            <button
              key={g}
              onClick={() => setStaffGroup(g)}
              className={`${pillBase} ${staffGroup === g ? pillActive : pillInactive}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Date filter */}
      {showDateFilter && (
        <div className="flex gap-0.5 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
          {DATE_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              className={`${pillBase} ${dateFilter === key ? pillActive : pillInactive}`}
            >
              {key === 'today' && (
                <span className="material-symbols-outlined text-[12px] mr-0.5 align-middle">today</span>
              )}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Custom date range inputs */}
      {showDateFilter && dateFilter === 'custom' && (
        <div className="flex items-center gap-2 bg-white border border-outline-variant/40 rounded-xl px-3 py-1.5">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">calendar_month</span>
          <input
            type="date"
            value={customDateRange.from}
            onChange={e => setCustomDateRange({ ...customDateRange, from: e.target.value })}
            className="text-xs font-medium bg-transparent focus:outline-none text-on-surface"
          />
          <span className="text-xs text-on-surface-variant">→</span>
          <input
            type="date"
            value={customDateRange.to}
            onChange={e => setCustomDateRange({ ...customDateRange, to: e.target.value })}
            className="text-xs font-medium bg-transparent focus:outline-none text-on-surface"
          />
        </div>
      )}
    </div>
  );
}
