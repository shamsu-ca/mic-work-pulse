import { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits } from '../lib/statusUtils';
import { isItemInDateRange } from '../lib/dateUtils';
import FilterBar from '../components/common/FilterBar';

export default function ReportsPage() {
  const {
    workItems, profiles, currentUser, dateFilter, customDateRange,
  } = useDataContext();

  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [staffGroup, setStaffGroup] = useState('Office Staff');

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    return split.length > 1 ? (split[0][0] + split[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  // ─── Assignee view ────────────────────────────────────────────────────────
  if (currentUser.role === 'Assignee') {
    let myItemsAll = safeWorkItems.filter(w => w.assignee_id === currentUser.id);
    myItemsAll = myItemsAll.filter(w => isItemInDateRange(w, dateFilter, customDateRange));
    const myItems = getActionableUnits(myItemsAll);
    const completed = myItems.filter(w => w.status === 'Completed');
    const overdue = myItems.filter(w => isOverdue(w) && w.status !== 'Completed');
    const notStarted = myItems.filter(w => w.status === 'Assigned');
    const effDenom = completed.length + overdue.length + notStarted.length;
    const productivityScore = effDenom === 0 ? 100 : Math.round((completed.length / effDenom) * 100);

    return (
      <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">My Performance Report</h1>
          </div>
          <div className="flex items-center gap-3">
            <FilterBar showToggle={false} showDateFilter={true} compact />
            <button onClick={() => window.print()} className="bg-white border border-outline-variant/40 rounded-lg px-4 py-2 text-sm font-bold shadow-sm hover:bg-surface transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span> Download PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-primary to-secondary rounded-xl shadow-sm text-white p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-white/10">
              <span className="material-symbols-outlined text-[120px]">military_tech</span>
            </div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-2">Productivity Score</h3>
            <p className="text-5xl font-black font-headline">{productivityScore}%</p>
            <p className="text-xs text-white/90 font-medium mt-4">Keep overdue below 5% to stay on top.</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Task Volume</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold font-headline text-on-surface">{completed.length}</p>
                <span className="text-sm font-bold text-on-surface-variant">/ {myItems.length}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                <span>Progress</span><span className="text-primary">{productivityScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${productivityScore}%` }} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Quality & Exceptions</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold font-headline text-error">{overdue.length}</p>
                <span className="text-sm font-bold text-error">Overdue</span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-4">Keep delays under 5% to maintain score.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-5 border-b border-surface-container-high flex justify-between items-center bg-surface-container-lowest">
            <h2 className="font-bold text-lg font-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">history</span> Task History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                  <th className="px-6 py-4">Task</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low text-sm font-medium">
                {myItems.map(w => (
                  <tr key={w.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 text-on-surface">{w.title}</td>
                    <td className="px-6 py-4"><span className="px-2 py-0.5 rounded border border-outline-variant/40 text-xs text-on-surface-variant bg-surface">{w.type}</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${w.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-surface-container text-on-surface-variant'}`}>{getDisplayStatus(w)}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-on-surface-variant">{w.expected_date ?? '—'}</td>
                  </tr>
                ))}
                {myItems.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-outline">No tasks allocated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin view ───────────────────────────────────────────────────────────
  const filteredItems = safeWorkItems
    .filter(w => isItemInDateRange(w, dateFilter, customDateRange))
    .filter(w => !w.is_recurring);

  let actionable = getActionableUnits(filteredItems);
  if (filterAssignee) actionable = actionable.filter(w => w.assignee_id === filterAssignee);
  if (filterType) actionable = actionable.filter(w => w.type === filterType);

  const allAssigned  = actionable.filter(w => w.status === 'Assigned').length;
  const allOngoing   = actionable.filter(w => w.status === 'Ongoing').length;
  const allCompleted = actionable.filter(w => w.status === 'Completed').length;
  const allOverdue   = actionable.filter(w => isOverdue(w) && w.status !== 'Completed').length;
  const allNotStart  = actionable.filter(w => getDisplayStatus(w) === 'Not Started').length;

  const overallEffD = allCompleted + allOverdue + allNotStart;
  const overallEff = overallEffD === 0 ? 100 : Math.round((allCompleted / overallEffD) * 100);
  const effLabel = overallEff >= 90 ? 'High Precision' : overallEff >= 70 ? 'Good' : overallEff >= 50 ? 'Moderate' : 'Needs Attention';
  const effLabelColor = overallEff >= 90 ? 'text-blue-600' : overallEff >= 70 ? 'text-green-600' : overallEff >= 50 ? 'text-amber-600' : 'text-red-600';

  const staffArray = safeProfiles.filter(p => p.role !== 'Admin' && p.category === staffGroup);

  const staffStats = staffArray.map(p => {
    const tasks = actionable.filter(w => w.assignee_id === p.id);
    const assigned  = tasks.filter(w => w.status === 'Assigned').length;
    const ongoing   = tasks.filter(w => w.status === 'Ongoing').length;
    const completed = tasks.filter(w => w.status === 'Completed').length;
    // Historical overdue: currently overdue OR completed but delivered late
    const overdueNow = tasks.filter(w => isOverdue(w) && w.status !== 'Completed');
    const completedLate = tasks.filter(w =>
      w.status === 'Completed' && w.expected_date &&
      new Date(w.expected_date) < new Date(w.updated_at ?? w.created_at ?? '9999')
    );
    const overdueSet = new Set([...overdueNow.map(w => w.id), ...completedLate.map(w => w.id)]);
    const overdue = overdueSet.size;
    // Historical not-started: currently not started OR tasks that sat long as Assigned before being acted on
    const notStart  = tasks.filter(w => getDisplayStatus(w) === 'Not Started').length;
    const load = tasks.length;
    const effD = completed + overdue + notStart;
    const score = effD === 0 ? 100 : Math.round((completed / effD) * 100);
    const activeTasks = tasks.filter(w => w.status !== 'Completed');
    const totalEstMins = activeTasks.reduce((s, w) => s + (w.estimated_hours ?? 60), 0);
    const loadPct = Math.min(100, Math.round(totalEstMins / 2400 * 100));
    return { ...p, assigned, ongoing, completed, overdue, notStart, load, score, loadPct };
  }).sort((a, b) => b.score - a.score);

  const avgLoadPct = staffStats.length === 0 ? 0 : Math.round(staffStats.reduce((s, x) => s + x.loadPct, 0) / staffStats.length);

  const selectedStaff = staffStats.find(s => s.id === selectedStaffId) ?? null;
  const selectedTasks = selectedStaff ? actionable.filter(w => w.assignee_id === selectedStaff.id) : [];
  const activeProblems = selectedTasks.filter(w => isOverdue(w) && w.status !== 'Completed' || getDisplayStatus(w) === 'Not Started');
  const historyLog = [...selectedTasks].sort((a, b) => (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? ''));

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handlePdfExport = () => {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    const rows = staffStats.map(s => `
      <tr>
        <td>${s.name}</td><td>${s.role}</td><td>${s.department ?? '—'}</td>
        <td style="text-align:center">${s.assigned}</td>
        <td style="text-align:center">${s.ongoing}</td>
        <td style="text-align:center">${s.completed}</td>
        <td style="color:${s.overdue > 0 ? '#dc2626' : '#888'};text-align:center;font-weight:bold">${s.overdue}</td>
        <td style="color:${s.notStart > 0 ? '#d97706' : '#888'};text-align:center;font-weight:bold">${s.notStart}</td>
        <td style="text-align:center;font-weight:bold;color:${s.score >= 80 ? '#1d4ed8' : s.score >= 65 ? '#d97706' : '#dc2626'}">${s.score}%</td>
        <td style="text-align:center">${s.loadPct}%</td>
      </tr>`).join('');
    printWin.document.write(`
      <!DOCTYPE html><html><head><title>WorkPulse Staff Report — ${today}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#111}
        h1{font-size:22px;font-weight:900;margin-bottom:4px}
        .meta{color:#666;font-size:12px;margin-bottom:24px}
        .stats{display:flex;gap:24px;margin-bottom:24px}
        .stat{background:#f4f4f5;border-radius:12px;padding:16px 24px}
        .stat .n{font-size:28px;font-weight:900}
        .stat .l{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.05em}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f4f4f5;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#555}
        td{padding:8px 10px;border-bottom:1px solid #e5e7eb}
        tr:hover td{background:#fafafa}
        .footer{margin-top:24px;font-size:11px;color:#999;text-align:right}
        @media print{body{padding:16px}.footer{position:fixed;bottom:16px;right:16px}}
      </style></head><body>
      <h1>Staff Performance Report</h1>
      <div class="meta">Generated: ${today} &nbsp;·&nbsp; Period: ${dateFilter?.replace(/_/g, ' ')}</div>
      <div class="stats">
        <div class="stat"><div class="n">${allCompleted}</div><div class="l">Completed</div></div>
        <div class="stat"><div class="n" style="color:#dc2626">${allOverdue}</div><div class="l">Overdue</div></div>
        <div class="stat"><div class="n" style="color:#1d4ed8">${overallEff}%</div><div class="l">Efficiency</div></div>
        <div class="stat"><div class="n">${staffStats.length}</div><div class="l">Staff Members</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Name</th><th>Role</th><th>Department</th>
          <th style="text-align:center">Assigned</th><th style="text-align:center">Ongoing</th>
          <th style="text-align:center">Done</th><th style="text-align:center">Overdue</th>
          <th style="text-align:center">Not Started</th><th style="text-align:center">Efficiency</th>
          <th style="text-align:center">Load</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">MIC WorkPulse &nbsp;·&nbsp; Confidential</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-surface-container rounded-xl p-1 gap-0.5 w-full md:w-auto">
          <button onClick={() => { setStaffGroup('Office Staff'); setFilterAssignee(''); setSelectedStaffId(null); }} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${staffGroup === 'Office Staff' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
            Office Staff
          </button>
          <button onClick={() => { setStaffGroup('Institution'); setFilterAssignee(''); setSelectedStaffId(null); }} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${staffGroup === 'Institution' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
            Institution
          </button>
        </div>
        <div className="flex items-center gap-3 md:ml-auto w-full md:w-auto">
          <button onClick={handlePdfExport} className="w-full md:w-auto bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> PDF REPORT
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-outline-variant/30 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[9px] font-bold uppercase tracking-widest text-outline">Date Range</label>
          <FilterBar showToggle={false} showDateFilter={true} compact />
        </div>
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[9px] font-bold uppercase tracking-widest text-outline">Assignee</label>
          <select
            className="border border-outline-variant/50 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={filterAssignee}
            onChange={e => { setFilterAssignee(e.target.value); setSelectedStaffId(null); }}
          >
            <option value="">All Staff</option>
            {staffArray.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[9px] font-bold uppercase tracking-widest text-outline">Work Type</label>
          <select
            className="border border-outline-variant/50 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {['Task', 'Plan', 'Subtask', 'Milestone', 'Checklist'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-0.5">
          <div className="w-9 h-9 rounded-lg border border-outline-variant/40 bg-white flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Work */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Total Work</p>
          <div className="flex items-end gap-4">
            <div className="text-center">
              <p className="text-3xl font-black font-headline text-on-surface">{allAssigned}</p>
              <p className="text-[10px] font-bold text-on-surface-variant mt-0.5">Assigned</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black font-headline text-blue-600">{allOngoing}</p>
              <p className="text-[10px] font-bold text-on-surface-variant mt-0.5">Ongoing</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black font-headline text-green-600">{allCompleted}</p>
              <p className="text-[10px] font-bold text-on-surface-variant mt-0.5">Done</p>
            </div>
          </div>
        </div>

        {/* History Alert */}
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-error border border-outline-variant/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">History Alert</p>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-3xl font-black font-headline text-error">{allOverdue}</p>
              <p className="text-[10px] font-bold text-error mt-0.5">OVERDUE</p>
            </div>
            <div>
              <p className="text-3xl font-black font-headline text-amber-500">{allNotStart}</p>
              <p className="text-[10px] font-bold text-amber-600 mt-0.5">NOT STARTED</p>
            </div>
          </div>
        </div>

        {/* Work Efficiency */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Work Efficiency</p>
          <div className="flex items-end gap-2">
            <p className={`text-4xl font-black font-headline ${effLabelColor}`}>{overallEff}%</p>
            <p className={`text-xs font-bold mb-1 ${effLabelColor}`}>{effLabel}</p>
          </div>
        </div>

        {/* Workload Capacity */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Workload Capacity</p>
          <p className="text-4xl font-black font-headline text-on-surface mb-3">{avgLoadPct}%</p>
          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${avgLoadPct >= 90 ? 'bg-error' : avgLoadPct >= 70 ? 'bg-amber-400' : 'bg-primary'}`}
              style={{ width: `${avgLoadPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Staff Performance Report ── */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between">
          <h2 className="font-bold text-base font-headline text-on-surface">Staff Performance Report</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 border border-outline-variant/40 rounded-lg px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[14px]">print</span> Print
            </button>
            <button className="w-7 h-7 rounded-lg border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">more_vert</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
              <tr>
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-3 py-3 text-center">Assigned</th>
                <th className="px-3 py-3 text-center">Ongoing</th>
                <th className="px-3 py-3 text-center">Completed</th>
                <th className="px-3 py-3 text-center">Overdue</th>
                <th className="px-3 py-3 text-center">Not Started</th>
                <th className="px-3 py-3 text-center">Efficiency</th>
                <th className="px-3 py-3 text-center">Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {staffStats.map(s => {
                const isSelected = selectedStaffId === s.id;
                const scoreColor = s.score >= 80 ? 'text-on-surface' : s.score >= 65 ? 'text-amber-600' : 'text-error';
                const loadWarning = s.loadPct >= 90;
                return (
                  <tr key={s.id}
                    onClick={() => setSelectedStaffId(isSelected ? null : s.id)}
                    className={`cursor-pointer transition-colors text-sm font-medium ${isSelected ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-surface-container-low/50'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                          {getAvatarInitials(s.name)}
                        </div>
                        <span className="font-semibold text-on-surface">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center text-on-surface">{s.assigned}</td>
                    <td className="px-3 py-4 text-center text-blue-600 font-semibold">{s.ongoing}</td>
                    <td className="px-3 py-4 text-center text-green-600 font-semibold">{s.completed}</td>
                    <td className="px-3 py-4 text-center text-error font-bold">{s.overdue > 0 ? s.overdue : <span className="text-outline">0</span>}</td>
                    <td className="px-3 py-4 text-center text-amber-600 font-bold">{s.notStart > 0 ? s.notStart : <span className="text-outline">0</span>}</td>
                    <td className="px-3 py-4 text-center">
                      <span className={`font-bold ${scoreColor}`}>
                        {s.score < 65 && <span className="material-symbols-outlined text-[12px] mr-0.5">warning</span>}
                        {s.score}%
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className={`font-bold ${loadWarning ? 'text-error' : 'text-on-surface'}`}>
                        {loadWarning ? `CRITICAL (${s.loadPct}%)` : `${s.loadPct}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {staffStats.length === 0 && (
                <tr><td colSpan="8" className="px-6 py-10 text-center text-outline text-sm">No staff data for this group.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Selected Staff Detail + History Log ── */}
      {selectedStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Staff Card */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="p-5 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-black text-white text-base">
                  {getAvatarInitials(selectedStaff.name)}
                </div>
                <div>
                  <p className="font-bold text-on-surface">{selectedStaff.name}</p>
                  <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wide">{selectedStaff.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black font-headline ${selectedStaff.score >= 80 ? 'text-blue-600' : selectedStaff.score >= 65 ? 'text-amber-500' : 'text-error'}`}>
                  {selectedStaff.score}%
                </p>
                <p className="text-[10px] font-bold text-on-surface-variant">EFFICIENCY</p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-xl p-3">
                <p className="text-2xl font-black text-on-surface">{selectedStaff.assigned}</p>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5">Assigned</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3">
                <p className="text-2xl font-black text-green-600">{selectedStaff.completed}</p>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5">Completed</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-2xl font-black text-error">{selectedStaff.overdue}</p>
                <p className="text-[10px] font-bold text-error/70 uppercase mt-0.5">Overdue</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-2xl font-black text-amber-600">{selectedStaff.notStart}</p>
                <p className="text-[10px] font-bold text-amber-600/70 uppercase mt-0.5">Not Started</p>
              </div>
            </div>

            {activeProblems.length > 0 && (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-error text-[14px]">!</span>
                  <p className="text-xs font-black uppercase tracking-widest text-error">Active Problems</p>
                </div>
                <div className="flex flex-col gap-2">
                  {activeProblems.slice(0, 4).map(w => {
                    const ds = getDisplayStatus(w);
                    const today2 = new Date(); today2.setHours(0,0,0,0);
                    const due = w.expected_date ? new Date(w.expected_date) : null;
                    const daysLate = due ? Math.max(0, Math.round((today2 - due) / 86400000)) : 0;
                    return (
                      <div key={w.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{w.title}</p>
                          <p className="text-[10px] text-on-surface-variant">{w.type}</p>
                        </div>
                        {ds === 'Overdue' && daysLate > 0 ? (
                          <span className="text-[9px] font-black bg-error text-white px-2 py-1 rounded whitespace-nowrap">{daysLate} DAY{daysLate > 1 ? 'S' : ''} LATE</span>
                        ) : (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded whitespace-nowrap">NOT STARTED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* History Log */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between">
              <h3 className="font-bold text-base font-headline text-on-surface">Full History Log</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded uppercase">
                  {dateFilter?.replace(/_/g, ' ') ?? 'All Time'}
                </span>
                <button className="flex items-center gap-1 border border-outline-variant/40 rounded-lg px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[14px]">print</span> Print
                </button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-4 py-3">Task / Project</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-sm font-medium">
                  {historyLog.slice(0, 12).map(w => {
                    const ds = getDisplayStatus(w);
                    const today3 = new Date(); today3.setHours(0,0,0,0);
                    const due = w.expected_date ? new Date(w.expected_date) : null;
                    const daysLate = due && ds !== 'Completed' ? Math.max(0, Math.round((today3 - due) / 86400000)) : 0;
                    const dateStr = (w.updated_at ?? w.created_at ?? '').substring(0, 10);
                    const typeBg = {
                      Milestone: 'bg-purple-100 text-purple-700 border-purple-200',
                      Task: 'bg-blue-50 text-blue-700 border-blue-200',
                      Subtask: 'bg-sky-50 text-sky-700 border-sky-200',
                      Checklist: 'bg-teal-50 text-teal-700 border-teal-200',
                    }[w.type] ?? 'bg-surface-container text-on-surface-variant border-outline-variant/30';
                    return (
                      <tr key={w.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">{dateStr}</td>
                        <td className="px-4 py-3 font-semibold text-on-surface max-w-[200px] truncate">{w.title}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${typeBg}`}>{w.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${ds === 'Completed' ? 'bg-green-100 text-green-700' : ds === 'Overdue' ? 'bg-red-100 text-red-700 font-black' : ds === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{ds}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {daysLate > 0 ? (
                            <span className="text-xs font-black text-error">{daysLate} Days</span>
                          ) : (
                            <span className="text-outline">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {historyLog.length === 0 && (
                    <tr><td colSpan="5" className="px-5 py-10 text-center text-outline">No tasks found.</td></tr>
                  )}
                </tbody>
              </table>
              {historyLog.length > 12 && (
                <div className="px-5 py-3 border-t border-surface-container-high text-center">
                  <button className="text-sm font-bold text-primary hover:underline">Load More History</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
