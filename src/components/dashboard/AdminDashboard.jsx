import React from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits } from '../../lib/statusUtils';
import { isItemInDateRange } from '../../lib/dateUtils';
import FilterBar from '../common/FilterBar';

export default function AdminDashboard() {
  const { profiles, workItems, containers, staffGroup, dateFilter, customDateRange } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  const filteredWorkItems = safeWorkItems.filter(w => isItemInDateRange(w, dateFilter, customDateRange));
  const filteredProfiles = safeProfiles.filter(p => p.staff_group === staffGroup && p.role !== 'Admin');

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getAssigneeName = (id) => safeProfiles.find(p => p.id === id)?.name || 'Unassigned';

  // Actionable units
  const nonRecurring = filteredWorkItems.filter(w => !w.is_recurring);
  const actionableItems = getActionableUnits(nonRecurring);

  // ── Task stats ──
  const totalTasks = actionableItems.length;
  const assignedTasks = actionableItems.filter(w => w.status === 'Assigned').length;
  const ongoingTasks = actionableItems.filter(w => w.status === 'Ongoing').length;
  const doneTasks = actionableItems.filter(w => w.status === 'Completed').length;

  // ── Active-only Projects & Events (exclude templates & inactive) ──
  const activeProjects = safeContainers.filter(c => c.type === 'Project' && c.is_active !== false && !c.is_template);
  const activeEvents = safeContainers.filter(c => c.type === 'Event' && c.is_active !== false && !c.is_template);

  const activeProjectIds = new Set(activeProjects.map(c => c.id));
  const activeEventIds = new Set(activeEvents.map(c => c.id));

  // Milestones inside active projects (for project sub-counts)
  const projMilestones = safeWorkItems.filter(w => w.type === 'Milestone' && activeProjectIds.has(w.container_id));
  const projMilestonesAssigned = projMilestones.filter(w => w.status === 'Assigned').length;
  const projMilestonesOngoing = projMilestones.filter(w => w.status === 'Ongoing').length;
  const projMilestonesDone = projMilestones.filter(w => w.status === 'Completed').length;

  // Checklists inside active events (for event sub-counts)
  const evtChecklists = safeWorkItems.filter(w => w.type === 'Checklist' && activeEventIds.has(w.container_id));
  const evtChecklistsAssigned = evtChecklists.filter(w => w.status === 'Assigned').length;
  const evtChecklistsOngoing = evtChecklists.filter(w => w.status === 'Ongoing').length;
  const evtChecklistsDone = evtChecklists.filter(w => w.status === 'Completed').length;

  // ── Overdue & Not Started — grouped by assignee ──
  const overdueItems = actionableItems.filter(w => isOverdue(w) && w.status !== 'Completed');
  const notStartedItems = actionableItems.filter(w => w.status === 'Assigned' && !isOverdue(w));

  const groupByAssignee = (items) => {
    const map = {};
    items.forEach(w => {
      const name = getAssigneeName(w.assignee_id);
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
  };
  const overdueByAssignee = groupByAssignee(overdueItems);
  const notStartedByAssignee = groupByAssignee(notStartedItems);

  // ── Today's Focus ──
  const todaysFocus = [...actionableItems]
    .filter(w => w.status !== 'Completed' && (w.priority === 'High' || w.priority === 'Critical'))
    .sort((a, b) => (a.expected_date || '').localeCompare(b.expected_date || ''))
    .slice(0, 4);

  // ── Priority Queue ──
  const priorityQueue = [...actionableItems]
    .filter(w => w.status !== 'Completed')
    .sort((a, b) => {
      const pOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    })
    .slice(0, 5);

  // ── Recent Activity (derive from work item status changes) ──
  const recentActivity = [...safeWorkItems]
    .filter(w => (w.status === 'Completed' || w.status === 'Ongoing') && !w.is_recurring)
    .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
    .slice(0, 6)
    .map(w => ({
      id: w.id,
      title: w.title,
      assigneeName: getAssigneeName(w.assignee_id),
      action: w.status === 'Completed' ? 'completed' : 'started',
      time: w.updated_at ? new Date(w.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    }));

  const statusBadgeCls = (w) => {
    const s = getDisplayStatus(w);
    if (s === 'Overdue') return 'bg-red-100 text-red-700';
    if (s === 'Ongoing') return 'bg-blue-100 text-blue-700';
    if (s === 'Completed') return 'bg-green-100 text-green-700';
    return 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-16 animate-fade-in">
      {/* Page Title + FilterBar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">System Overview</h1>
          </div>
        </div>
        <FilterBar showToggle={true} showDateFilter={true} />
      </div>

      {/* OVERDUE & NOT STARTED — with assignee breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-l-4 border-error shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-error" style={{fontVariationSettings:"'FILL' 1"}}>warning</span>
            </div>
            <div>
              <p className="text-xs font-black text-error uppercase tracking-widest">Overdue</p>
              <p className="text-[10px] text-on-surface-variant">Tasks past due date</p>
            </div>
            <p className="text-4xl font-black text-error ml-auto">{overdueItems.length}</p>
          </div>
          {overdueByAssignee.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-2">
              {overdueByAssignee.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[8px] font-black text-red-700 flex-shrink-0">{getAvatarInitials(name)}</div>
                    <span className="text-xs font-medium text-on-surface truncate max-w-[140px]">{name}</span>
                  </div>
                  <span className="text-xs font-black text-error bg-red-50 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-green-600 font-bold mt-2">All clear!</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border-l-4 border-amber-400 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600" style={{fontVariationSettings:"'FILL' 1"}}>schedule</span>
            </div>
            <div>
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Not Started</p>
              <p className="text-[10px] text-on-surface-variant">Pending kick-off</p>
            </div>
            <p className="text-4xl font-black text-amber-600 ml-auto">{notStartedItems.length}</p>
          </div>
          {notStartedByAssignee.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-2">
              {notStartedByAssignee.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[8px] font-black text-amber-700 flex-shrink-0">{getAvatarInitials(name)}</div>
                    <span className="text-xs font-medium text-on-surface truncate max-w-[140px]">{name}</span>
                  </div>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-green-600 font-bold mt-2">All clear!</p>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>assignment</span>
            </div>
            <p className="text-4xl font-black text-on-surface">{totalTasks}</p>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Total Tasks</p>
          <div className="h-px bg-outline-variant/20 mb-3"></div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Assigned</p><p className="font-black text-on-surface">{assignedTasks}</p></div>
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Ongoing</p><p className="font-black text-on-surface">{ongoingTasks}</p></div>
            <div><p className="text-[10px] text-green-600 font-bold uppercase">Done</p><p className="font-black text-green-600">{doneTasks}</p></div>
          </div>
          <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: totalTasks === 0 ? '0%' : `${(doneTasks / totalTasks) * 100}%` }}></div>
          </div>
        </div>

        {/* Projects — active only, milestone sub-counts */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>folder_open</span>
            </div>
            <p className="text-4xl font-black text-on-surface">{activeProjects.length}</p>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Active Projects</p>
          <div className="h-px bg-outline-variant/20 mb-3"></div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Assigned</p><p className="font-black text-on-surface">{projMilestonesAssigned}</p></div>
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Ongoing</p><p className="font-black text-on-surface">{projMilestonesOngoing}</p></div>
            <div><p className="text-[10px] text-green-600 font-bold uppercase">Done</p><p className="font-black text-green-600">{projMilestonesDone}</p></div>
          </div>
          <p className="text-[9px] text-on-surface-variant mt-2 text-center">milestone breakdown</p>
          <div className="mt-2 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            {(() => { const t = projMilestones.length; return <div className="h-full bg-indigo-500 rounded-full" style={{ width: t === 0 ? '0%' : `${(projMilestonesDone / t) * 100}%` }}></div>; })()}
          </div>
        </div>

        {/* Events — active only, checklist sub-counts */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600" style={{fontVariationSettings:"'FILL' 1"}}>event</span>
            </div>
            <p className="text-4xl font-black text-on-surface">{activeEvents.length}</p>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Active Events</p>
          <div className="h-px bg-outline-variant/20 mb-3"></div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Assigned</p><p className="font-black text-on-surface">{evtChecklistsAssigned}</p></div>
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Ongoing</p><p className="font-black text-on-surface">{evtChecklistsOngoing}</p></div>
            <div><p className="text-[10px] text-green-600 font-bold uppercase">Done</p><p className="font-black text-green-600">{evtChecklistsDone}</p></div>
          </div>
          <p className="text-[9px] text-on-surface-variant mt-2 text-center">checklist breakdown</p>
          <div className="mt-2 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            {(() => { const t = evtChecklists.length; return <div className="h-full bg-green-500 rounded-full" style={{ width: t === 0 ? '0%' : `${(evtChecklistsDone / t) * 100}%` }}></div>; })()}
          </div>
        </div>
      </div>

      {/* ── Bottom Split: Focus + Queue (left) · Recent Activity (right) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Today's Focus */}
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full"></div>
                <h2 className="font-bold text-on-surface font-headline">Today's Focus</h2>
              </div>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full uppercase tracking-widest">HIGH PRIORITY</span>
            </div>
            <div className="flex flex-col gap-2">
              {todaysFocus.length === 0 && <p className="text-sm text-on-surface-variant text-center py-6 italic">No high priority items right now 🎉</p>}
              {todaysFocus.map(t => {
                const s = getDisplayStatus(t);
                const od = s === 'Overdue';
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${od ? 'border-error bg-red-50' : 'border-primary/30 bg-surface-container-low'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${od ? 'bg-red-100' : 'bg-primary/10'}`}>
                      <span className="material-symbols-outlined text-[16px] text-primary" style={{fontVariationSettings:"'FILL' 1"}}>{od ? 'warning' : 'assignment'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{t.type || 'Task'} · {s}</p>
                      <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                      {t.expected_date && <p className="text-[10px] text-on-surface-variant">Due {t.expected_date}</p>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${od ? 'bg-red-100 text-red-700' : 'bg-surface-container text-on-surface-variant'}`}>{od ? 'URGENT' : 'STABLE'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Queue */}
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-on-surface font-headline">Priority Queue</h2>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">filter_list</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-surface-container-high">
                    <th className="pb-2 text-left">Subject</th>
                    <th className="pb-2 text-left">Assigned</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {priorityQueue.map(t => {
                    const s = getDisplayStatus(t);
                    return (
                      <tr key={t.id} className="text-sm">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'Critical' ? 'bg-error' : t.priority === 'High' ? 'bg-orange-500' : 'bg-primary'}`}></span>
                            <span className="font-medium text-on-surface truncate max-w-[150px]">{t.title}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary">{getAvatarInitials(getAssigneeName(t.assignee_id))}</div>
                            <span className="text-on-surface-variant">{getAssigneeName(t.assignee_id).split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusBadgeCls(t)}`}>{s}</span>
                        </td>
                        <td className="py-2.5 text-on-surface-variant">{t.expected_date || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {priorityQueue.length === 0 && <p className="text-center py-6 text-on-surface-variant text-sm italic">All clear!</p>}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-green-500 rounded-full"></div>
              <h2 className="font-bold text-on-surface font-headline">Recent Activity</h2>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {recentActivity.length === 0 && (
                <p className="text-sm text-on-surface-variant italic text-center py-8">No activity yet.</p>
              )}
              {recentActivity.map(act => (
                <div key={act.id} className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${act.action === 'completed' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <span className={`material-symbols-outlined text-[13px] ${act.action === 'completed' ? 'text-green-600' : 'text-blue-600'}`} style={{fontVariationSettings:"'FILL' 1"}}>
                      {act.action === 'completed' ? 'check_circle' : 'play_circle'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-on-surface leading-snug">
                      <span className="font-bold">{act.assigneeName.split(' ')[0]}</span>
                      {' '}<span className={`font-medium ${act.action === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>{act.action}</span>{' '}
                      <span className="truncate">{act.title}</span>
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
