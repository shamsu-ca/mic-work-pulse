import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus } from '../lib/statusUtils';

export default function StaffOverviewPage() {
  const { profiles, workItems, staffGroup } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  const [expandedId, setExpandedId] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Filter by staffGroup toggle AND non-Admin
  const staffList = safeProfiles.filter(p => p.role !== 'Admin' && p.staff_group === staffGroup);

  const departments = ['All', ...new Set(staffList.map(p => p.department).filter(Boolean))];

  const filteredStaff = departmentFilter === 'All'
    ? staffList
    : staffList.filter(s => s.department === departmentFilter);

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getMetrics = (staffId) => {
    const tasks = safeWorkItems.filter(t => t.assignee_id === staffId);
    let overdue = 0, notStarted = 0, ongoing = 0, completed = 0, assigned = 0;
    tasks.forEach(t => {
      const s = getDisplayStatus(t);
      if (s === 'Completed') completed++;
      else if (s === 'Overdue') overdue++;
      else if (s === 'Ongoing') ongoing++;
      else if (s === 'Not Started') notStarted++;
      else assigned++;
    });
    const total = tasks.length;
    const efficiency = total === 0 ? 0 : Math.round((completed / total) * 100);
    const workload = total === 0 ? 0 : Math.min(100, Math.round(((overdue * 2 + ongoing + assigned) / Math.max(total, 8)) * 100));
    return { overdue, notStarted, ongoing, completed, assigned, total, efficiency, workload, tasks };
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Staff Distribution & Velocity</h1>
          <p className="text-on-surface-variant font-medium text-sm">Real-time performance metrics — <span className="font-bold text-primary">{staffGroup}</span></p>
        </div>
        <select
          className="bg-white border border-outline-variant/40 rounded-lg px-4 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary"
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
        >
          {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>
      </div>

      {/* Staff cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStaff.map(staff => {
          const m = getMetrics(staff.id);
          const isExpanded = expandedId === staff.id;
          const isOverloaded = m.overdue > 0;

          return (
            <div
              key={staff.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                isExpanded
                  ? 'border-primary/40 shadow-md shadow-primary/10 md:col-span-2'
                  : 'border-outline-variant/30 hover:shadow-md cursor-pointer'
              }`}
              onClick={() => setExpandedId(isExpanded ? null : staff.id)}
            >
              {/* Card Header */}
              <div className="p-5 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {staff.avatar_url
                    ? <img src={staff.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-outline-variant/30" />
                    : <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm border-2 border-primary/20">{getAvatarInitials(staff.name)}</div>
                  }
                  <div>
                    <p className="font-bold text-on-surface">{staff.name}</p>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{staff.department || 'No Department'}</p>
                    {staff.manager && <p className="text-[10px] text-on-surface-variant mt-0.5">Manager: {staff.manager}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isOverloaded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isOverloaded ? '⚠ Overloaded' : '● Active'}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                </div>
              </div>

              {/* Stats row (always visible) */}
              <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Overdue</p>
                  <p className="text-2xl font-black text-red-600 mt-1">{String(m.overdue).padStart(2,'0')}</p>
                  <p className="text-[10px] text-red-500 mt-1">Not Started: {String(m.notStarted).padStart(2,'0')}</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3">
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    <span>Assigned</span><span>Ongoing</span><span>Done</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-on-surface">
                    <span>{String(m.assigned).padStart(2,'0')}</span>
                    <span>{String(m.ongoing).padStart(2,'0')}</span>
                    <span>{String(m.completed).padStart(2,'0')}</span>
                  </div>
                </div>
              </div>

              {/* Progress bars (always visible) */}
              <div className="px-5 pb-4 flex flex-col gap-2">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                    <span>WORK EFFICIENCY</span>
                    <span className="text-primary">{m.efficiency}%</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${m.efficiency}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                    <span>WORKLOAD CAPACITY</span>
                    <span className={m.workload > 80 ? 'text-error' : 'text-on-surface-variant'}>{m.workload}% CAP</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.workload > 80 ? 'bg-error' : 'bg-on-surface-variant'}`} style={{ width: `${m.workload}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Expanded: task list */}
              {isExpanded && (
                <div className="border-t border-surface-container-high mx-5 mt-1 pt-4 pb-5">
                  <div className="flex gap-4 mb-3">
                    <span className="text-xs font-bold text-primary border-b-2 border-primary pb-1">Active Tasks ({m.total - m.completed})</span>
                    <span className="text-xs font-medium text-on-surface-variant">Completed ({m.completed})</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').length === 0 && (
                      <p className="text-xs text-on-surface-variant italic">No active tasks.</p>
                    )}
                    {m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').map(t => {
                      const s = getDisplayStatus(t);
                      const isOverdue = s === 'Overdue';
                      return (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-error' : 'bg-primary'}`}></span>
                            <div>
                              <p className="text-sm font-semibold text-on-surface">{t.title}</p>
                              <p className="text-[10px] text-on-surface-variant">{t.type || 'Task'} {t.expected_date ? `· Due ${t.expected_date}` : ''}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-700' : s === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant'}`}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
          <p className="font-bold">No staff in <strong>{staffGroup}</strong> for this filter.</p>
        </div>
      )}
    </div>
  );
}
