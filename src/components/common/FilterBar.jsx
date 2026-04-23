import { useDataContext } from '../../context/SupabaseDataContext';

const DATE_OPTIONS = [
  { key: 'today',     label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'lastmonth', label: 'Last Month' },
  { key: 'custom',    label: 'Custom' },
];

const todayISO = () => new Date().toISOString().split('T')[0];

// Standalone Staff group toggle — import and drop anywhere
export function StaffToggle() {
  const { staffGroup, setStaffGroup } = useDataContext();
  const options = [
    { key: 'Office Staff', icon: 'business_center', color: 'text-blue-600' },
    { key: 'Institution',  icon: 'school',          color: 'text-emerald-600' },
  ];
  return (
    <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
      {options.map(({ key, icon, color }) => (
        <button
          key={key}
          onClick={() => setStaffGroup(key)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
            staffGroup === key ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className={`material-symbols-outlined text-[14px] ${staffGroup === key ? color : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          <span className="hidden sm:inline">{key}</span>
        </button>
      ))}
    </div>
  );
}

export default function FilterBar({ showToggle = false, showDateFilter = true }) {
  const {
    dateFilter, setDateFilter,
    customDateRange, setCustomDateRange,
    staffGroup, setStaffGroup,
  } = useDataContext();

  const handleDateFilterChange = (val) => {
    setDateFilter(val);
    if (val === 'custom') {
      // auto-fill "to" with today if not already set
      setCustomDateRange(prev => ({
        from: prev.from || '',
        to: prev.to || todayISO(),
      }));
    } else {
      // reset custom range when switching away
      setCustomDateRange({ from: '', to: '' });
    }
  };

  const clearCustom = () => {
    setDateFilter('today');
    setCustomDateRange({ from: '', to: '' });
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">


      {showDateFilter && (
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="appearance-none bg-white border border-outline-variant/40 rounded-full px-3 py-1.5 pr-8 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
          >
            {DATE_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">
            arrow_drop_down
          </span>
        </div>
      )}

      {showDateFilter && dateFilter === 'custom' && (
        <div className="flex items-center gap-2 bg-white border border-outline-variant/40 rounded-xl px-3 py-1.5">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">calendar_month</span>
          <input
            type="date"
            value={customDateRange.from}
            onChange={e => setCustomDateRange({ ...customDateRange, from: e.target.value })}
            className="text-xs font-medium bg-transparent focus:outline-none text-on-surface w-28"
          />
          <span className="text-xs text-on-surface-variant">–</span>
          <input
            type="date"
            value={customDateRange.to}
            onChange={e => setCustomDateRange({ ...customDateRange, to: e.target.value })}
            className="text-xs font-medium bg-transparent focus:outline-none text-on-surface w-28"
          />
          <button
            onClick={clearCustom}
            className="ml-1 text-on-surface-variant hover:text-error transition-colors"
            title="Clear custom date"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
      {showToggle && <StaffToggle />}
    </div>
  );
}
