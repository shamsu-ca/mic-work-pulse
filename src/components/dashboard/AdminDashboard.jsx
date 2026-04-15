import React, { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus } from '../../lib/statusUtils';

export default function AdminDashboard() {
  const { profiles, workItems, containers, staffGroup } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  const filteredProfiles = safeProfiles.filter(p => p.staff_group === staffGroup && p.role !== 'Admin');

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getAssigneeName = (id) => {
    const p = safeProfiles.find(p => p.id === id);
    return p?.name || 'Unassigned';
  };

  // ── Stats ──
  const totalTasks = safeWorkItems.filter(w => !w.is_recurring).length;
  const assignedTasks = safeWorkItems.filter(w => getDisplayStatus(w) === 'Assigned' || getDisplayStatus(w) === 'Not Started').length;
  const ongoingTasks = safeWorkItems.filter(w => getDisplayStatus(w) === 'Ongoing').length;
  const doneTasks = safeWorkItems.filter(w => getDisplayStatus(w) === 'Completed').length;

  const activeProjects = safeContainers.filter(c => c.type === 'Project').length;
  const plannedProj = safeContainers.filter(c => c.type === 'Project' && (c.progress || 0) === 0).length;
  const closedProj = safeContainers.filter(c => c.type === 'Project' && (c.progress || 0) === 100).length;
  const activeContProj = activeProjects - plannedProj - closedProj;

  const totalEvents = safeContainers.filter(c => c.type === 'Event').length;
  const ongoingEvents = safeContainers.filter(c => c.type === 'Event' && (c.progress || 0) > 0 && (c.progress || 0) < 100).length;
  const endedEvents = safeContainers.filter(c => c.type === 'Event' && (c.progress || 0) === 100).length;
  const inviteEvents = totalEvents - ongoingEvents - endedEvents;

  // ── Critical items ──
  const overdueItems = safeWorkItems.filter(w => getDisplayStatus(w) === 'Overdue');
  const notStartedItems = safeWorkItems.filter(w => getDisplayStatus(w) === 'Not Started');

  // Group overdue by assignee
  const overdueByPerson = filteredProfiles.map(p => ({
    p,
    count: overdueItems.filter(w => w.assignee_id === p.id).length
  })).filter(x => x.count > 0).slice(0, 4);

  const notStartedByPerson = filteredProfiles.map(p => ({
    p,
    count: notStartedItems.filter(w => w.assignee_id === p.id).length
  })).filter(x => x.count > 0).slice(0, 4);

  // ── Today's Focus: high priority, non-completed ──
  const todaysFocus = [...safeWorkItems]
    .filter(w => getDisplayStatus(w) !== 'Completed' && w.priority === 'High' || w.priority === 'Critical')
    .sort((a, b) => (a.expected_date || '').localeCompare(b.expected_date || ''))
    .slice(0, 4);

  // ── Priority Queue ──
  const priorityQueue = [...safeWorkItems]
    .filter(w => getDisplayStatus(w) !== 'Completed')
    .sort((a, b) => {
      const pOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    })
    .slice(0, 5);

  const statusBadgeCls = (w) => {
    const s = getDisplayStatus(w);
    if (s === 'Overdue') return 'bg-red-100 text-red-700';
    if (s === 'Ongoing') return 'bg-blue-100 text-blue-700';
    if (s === 'Completed') return 'bg-green-100 text-green-700';
    return 'bg-surface-container text-on-surface-variant';
  };

  const priorityCls = (p) => {
    if (p === 'Critical') return 'bg-red-100 text-red-700';
    if (p === 'High') return 'bg-orange-100 text-orange-700';
    return 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-16 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">System Overview</h1>
          <p className="text-sm text-on-surface-variant font-medium">Real-time enterprise performance metrics · <span className="font-bold text-primary">{staffGroup}</span></p>
        </div>
      </div>

      {/* ── Alert Banners ── */}
      {(overdueItems.length > 0 || notStartedItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueItems.length > 0 && (
            <div className="bg-white border-l-4 border-error rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-error text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>warning</span>
                </div>
                <div>
                  <p className="text-xs font-black text-error uppercase tracking-widest">Critical Overdue</p>
                  <p className="text-xs text-on-surface-variant">{overdueItems.length} tasks requiring immediate attention</p>
                </div>
              </div>
              {overdueByPerson.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {overdueByPerson.map(({ p, count }) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-[8px] font-black text-red-700">{getAvatarInitials(p.name)}</div>
                      <div>
                        <p className="text-[9px] font-bold text-on-surface uppercase">{p.name.split(' ')[0]}</p>
                        <p className="text-xs font-black text-error">{count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {notStartedItems.length > 0 && (
            <div className="bg-white border-l-4 border-amber-400 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>chat_bubble</span>
                </div>
                <div>
                  <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Not Started</p>
                  <p className="text-xs text-on-surface-variant">High priority items pending kick-off</p>
                </div>
              </div>
              {notStartedByPerson.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {notStartedByPerson.map(({ p, count }) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[8px] font-black text-amber-700">{getAvatarInitials(p.name)}</div>
                      <div>
                        <p className="text-[9px] font-bold text-on-surface uppercase">{p.name.split(' ')[0]}</p>
                        <p className="text-xs font-black text-amber-700">{count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

        {/* Projects */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>folder_open</span>
            </div>
            <p className="text-4xl font-black text-on-surface">{activeProjects}</p>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Active Projects</p>
          <div className="h-px bg-outline-variant/20 mb-3"></div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Planned</p><p className="font-black text-on-surface">{String(plannedProj).padStart(2,'0')}</p></div>
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Active</p><p className="font-black text-on-surface">{String(activeContProj).padStart(2,'0')}</p></div>
            <div><p className="text-[10px] text-green-600 font-bold uppercase">Closed</p><p className="font-black text-green-600">{String(closedProj).padStart(2,'0')}</p></div>
          </div>
          <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: activeProjects === 0 ? '0%' : `${(activeContProj / activeProjects) * 100}%` }}></div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600" style={{fontVariationSettings:"'FILL' 1"}}>event</span>
            </div>
            <p className="text-4xl font-black text-on-surface">{totalEvents}</p>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Scheduled Events</p>
          <div className="h-px bg-outline-variant/20 mb-3"></div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Invites</p><p className="font-black text-on-surface">{String(inviteEvents).padStart(2,'0')}</p></div>
            <div><p className="text-[10px] text-on-surface-variant font-bold uppercase">Live</p><p className="font-black text-on-surface">{String(ongoingEvents).padStart(2,'0')}</p></div>
            <div><p className="text-[10px] text-green-600 font-bold uppercase">Ended</p><p className="font-black text-green-600">{String(endedEvents).padStart(2,'0')}</p></div>
          </div>
          <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: totalEvents === 0 ? '0%' : `${(ongoingEvents / totalEvents) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* ── Bottom Split Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Focus */}
        <div className="md:col-span-2 flex flex-col gap-4">
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
                const isOverdue = s === 'Overdue';
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${isOverdue ? 'border-error bg-red-50' : 'border-primary/30 bg-surface-container-low'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-primary/10'}`}>
                      <span className="material-symbols-outlined text-[16px] text-primary" style={{fontVariationSettings:"'FILL' 1"}}>{isOverdue ? 'warning' : 'assignment'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{t.type || 'Task'} · {s}</p>
                      <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                      {t.expected_date && <p className="text-[10px] text-on-surface-variant">Due {t.expected_date}</p>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-surface-container text-on-surface-variant'}`}>{isOverdue ? 'URGENT' : 'STABLE'}</span>
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

        {/* Recent Activity (Staff workload) */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-on-surface font-headline">Staff Workload</h2>
            <span className="text-[10px] text-primary font-bold">VIEW ALL</span>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {filteredProfiles.slice(0, 6).map(p => {
              const tasks = safeWorkItems.filter(w => w.assignee_id === p.id);
              const completed = tasks.filter(w => getDisplayStatus(w) === 'Completed').length;
              const total = tasks.length;
              const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
              const overdue = tasks.filter(w => getDisplayStatus(w) === 'Overdue').length;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{getAvatarInitials(p.name)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-on-surface truncate">{p.name}</p>
                      {overdue > 0 && <span className="text-[9px] font-bold text-error">{overdue} late</span>}
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${overdue > 0 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant w-8 text-right flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
            {filteredProfiles.length === 0 && <p className="text-sm text-on-surface-variant italic text-center mt-4">No staff in {staffGroup}.</p>}
          </div>

          {/* Weekly efficiency */}
          <div className="mt-4 bg-primary rounded-xl p-4">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">WEEKLY EFFICIENCY</p>
            <p className="text-2xl font-black text-white mt-1">
              {safeWorkItems.length === 0 ? '0%' : `${Math.round((safeWorkItems.filter(w => getDisplayStatus(w) === 'Completed').length / safeWorkItems.length) * 100)}%`}
            </p>
            <p className="text-[10px] text-white/70 mt-1">completion rate across all tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
