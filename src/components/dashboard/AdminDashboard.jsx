import { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits, getStatusBadgeClass } from '../../lib/statusUtils';
import FilterBar from '../common/FilterBar';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function AdminDashboard() {
  const { profiles, workItems, containers } = useDataContext();
  const safeProfiles   = profiles   || [];
  const safeWorkItems  = workItems  || [];
  const safeContainers = containers || [];

  // Dashboard is a LIVE view — no date filter applied

  const [expandedCard, setExpandedCard] = useState(null); // 'tasks' | 'projects' | 'events'

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };
  const getAssigneeName = (id) => safeProfiles.find(p => p.id === id)?.name || 'Unassigned';
  const getContainer    = (id) => safeContainers.find(c => c.id === id);

  // Actionable units (no date filter — live view)
  const nonRecurring    = safeWorkItems.filter(w => !w.is_recurring);
  const actionableItems = getActionableUnits(nonRecurring);

  // ── Task stats ──
  const totalTasks    = actionableItems.length;
  const assignedTasks = actionableItems.filter(w => w.status === 'Assigned').length;
  const ongoingTasks  = actionableItems.filter(w => w.status === 'Ongoing').length;
  const doneTasks     = actionableItems.filter(w => w.status === 'Completed').length;

  // ── Active Projects & Events ──
  const activeProjects = safeContainers.filter(c => c.type === 'Project' && c.is_active !== false && !c.is_template);
  const activeEvents   = safeContainers.filter(c => c.type === 'Event'   && c.is_active !== false && !c.is_template);

  const activeProjectIds = new Set(activeProjects.map(c => c.id));
  const activeEventIds   = new Set(activeEvents.map(c => c.id));

  const projMilestones         = safeWorkItems.filter(w => w.type === 'Milestone' && activeProjectIds.has(w.container_id));
  const projMilestonesAssigned = projMilestones.filter(w => w.status === 'Assigned').length;
  const projMilestonesOngoing  = projMilestones.filter(w => w.status === 'Ongoing').length;
  const projMilestonesDone     = projMilestones.filter(w => w.status === 'Completed').length;

  const evtChecklists         = safeWorkItems.filter(w => w.type === 'Checklist' && activeEventIds.has(w.container_id));
  const evtChecklistsAssigned = evtChecklists.filter(w => w.status === 'Assigned').length;
  const evtChecklistsOngoing  = evtChecklists.filter(w => w.status === 'Ongoing').length;
  const evtChecklistsDone     = evtChecklists.filter(w => w.status === 'Completed').length;

  // ── Overdue & Not Started (live) ──
  const overdueItems    = actionableItems.filter(w => isOverdue(w) && w.status !== 'Completed');
  const notStartedItems = actionableItems.filter(w => getDisplayStatus(w) === 'Not Started');

  const groupByAssignee = (items) => {
    const map = {};
    items.forEach(w => {
      const name = getAssigneeName(w.assignee_id);
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
  };
  const overdueByAssignee    = groupByAssignee(overdueItems);
  const notStartedByAssignee = groupByAssignee(notStartedItems);

  // ── Today's Focus: all items due today + overdue + not started (ordered) ──
  const today = todayStr();
  const todayOverdue     = actionableItems.filter(w => isOverdue(w) && w.status !== 'Completed');
  const todayNotStarted  = actionableItems.filter(w => getDisplayStatus(w) === 'Not Started' && !isOverdue(w));
  const todayDueToday    = actionableItems.filter(w =>
    w.status !== 'Completed' &&
    !isOverdue(w) &&
    getDisplayStatus(w) !== 'Not Started' &&
    w.expected_date === today
  );
  const todaysFocus = [
    ...todayOverdue.sort((a,b) => { const p={Critical:0,High:1,Medium:2,Low:3}; return (p[a.priority]??2)-(p[b.priority]??2); }),
    ...todayNotStarted.sort((a,b) => { const p={Critical:0,High:1,Medium:2,Low:3}; return (p[a.priority]??2)-(p[b.priority]??2); }),
    ...todayDueToday.sort((a,b) => { const p={Critical:0,High:1,Medium:2,Low:3}; return (p[a.priority]??2)-(p[b.priority]??2); }),
  ];

  // ── Priority Queue: Critical & High only ──
  const priorityQueue = [...actionableItems]
    .filter(w => w.status !== 'Completed' && (w.priority === 'Critical' || w.priority === 'High'))
    .sort((a, b) => {
      const pOrder = { Critical: 0, High: 1 };
      return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
    })
    .slice(0, 8);

  // ── Recent Activity ──
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

  const priorityCls = (p) => {
    if (p === 'Critical') return 'bg-red-100 text-red-700';
    if (p === 'High')     return 'bg-orange-100 text-orange-700';
    if (p === 'Medium')   return 'bg-blue-100 text-blue-700';
    return 'bg-surface-container text-on-surface-variant';
  };

  // Focus item tag: container name if available
  const getFocusTag = (item) => {
    const c = item.container_id ? getContainer(item.container_id) : null;
    if (c) return { label: c.title, cls: c.type === 'Project' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return null;
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-16 animate-fade-in">
      {/* Header — staff group toggle only (no date filter, dashboard is live) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">System Overview</h1>
          <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Live view · updates in real time</p>
        </div>
        <FilterBar showToggle={true} showDateFilter={false} />
      </div>

      {/* OVERDUE & NOT STARTED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-l-4 border-error shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-error" style={{fontVariationSettings:"'FILL' 1"}}>warning</span>
            </div>
            <div>
              <p className="text-xs font-black text-error uppercase tracking-widest">Overdue</p>
              <p className="text-[10px] text-on-surface-variant">Pending — past due date</p>
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
          ) : <p className="text-xs text-green-600 font-bold mt-2">All clear!</p>}
        </div>

        <div className="bg-white rounded-2xl border-l-4 border-amber-400 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600" style={{fontVariationSettings:"'FILL' 1"}}>schedule</span>
            </div>
            <div>
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Not Started</p>
              <p className="text-[10px] text-on-surface-variant">Assigned — not yet begun</p>
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
          ) : <p className="text-xs text-green-600 font-bold mt-2">All clear!</p>}
        </div>
      </div>

      {/* ── Stat Cards (clickable to expand) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tasks */}
        <div
          className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all duration-200 ${expandedCard === 'tasks' ? 'border-primary/50 shadow-md md:col-span-3' : 'border-outline-variant/30 hover:shadow-md'}`}
          onClick={() => setExpandedCard(expandedCard === 'tasks' ? null : 'tasks')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>assignment</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-black text-on-surface">{totalTasks}</p>
              <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${expandedCard === 'tasks' ? 'rotate-90' : ''}`}>chevron_right</span>
            </div>
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
          {expandedCard === 'tasks' && (
            <div className="mt-5 border-t border-surface-container-high pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">All Actionable Work Items</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {actionableItems.filter(w => w.status !== 'Completed').map(w => {
                  const ds = getDisplayStatus(w);
                  const c = w.container_id ? getContainer(w.container_id) : null;
                  return (
                    <div key={w.id} className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${isOverdue(w) ? 'bg-red-50 border-red-100' : 'bg-surface-container-low border-outline-variant/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${ds === 'Overdue' ? 'bg-error' : ds === 'Ongoing' ? 'bg-blue-500' : ds === 'Not Started' ? 'bg-amber-400' : 'bg-outline'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface truncate">{w.title}</p>
                        <p className="text-on-surface-variant text-[10px]">{getAssigneeName(w.assignee_id).split(' ')[0]} · {w.expected_date || 'no date'}</p>
                        {c && <p className="text-[10px] text-indigo-600 truncate">{c.title}</p>}
                      </div>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(ds)}`}>{ds}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Projects */}
        <div
          className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all duration-200 ${expandedCard === 'projects' ? 'border-indigo-400/60 shadow-md md:col-span-3' : 'border-outline-variant/30 hover:shadow-md'}`}
          onClick={() => setExpandedCard(expandedCard === 'projects' ? null : 'projects')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>folder_open</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-black text-on-surface">{activeProjects.length}</p>
              <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${expandedCard === 'projects' ? 'rotate-90' : ''}`}>chevron_right</span>
            </div>
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
          {expandedCard === 'projects' && (
            <div className="mt-5 border-t border-surface-container-high pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Projects & Their Milestones</p>
              <div className="flex flex-col gap-4">
                {activeProjects.map(proj => {
                  const milestones = safeWorkItems.filter(w => w.container_id === proj.id && w.type === 'Milestone');
                  const done = milestones.filter(w => w.status === 'Completed').length;
                  return (
                    <div key={proj.id} className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-indigo-600 text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>folder_open</span>
                        <span className="font-bold text-sm text-on-surface">{proj.title}</span>
                        <span className="ml-auto text-[10px] font-bold text-indigo-600">{done}/{milestones.length} milestones</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {milestones.map(m => {
                          const ds = getDisplayStatus(m);
                          return (
                            <div key={m.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-indigo-100/60 text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ds === 'Completed' ? 'bg-green-500' : ds === 'Overdue' ? 'bg-error' : ds === 'Ongoing' ? 'bg-blue-500' : 'bg-outline'}`} />
                              <span className="flex-1 truncate font-medium text-on-surface">{m.title}</span>
                              <span className="text-on-surface-variant flex-shrink-0">{getAssigneeName(m.assignee_id).split(' ')[0]}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(ds)}`}>{ds}</span>
                            </div>
                          );
                        })}
                        {milestones.length === 0 && <p className="text-xs text-on-surface-variant italic px-1">No milestones yet.</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Events */}
        <div
          className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all duration-200 ${expandedCard === 'events' ? 'border-emerald-400/60 shadow-md md:col-span-3' : 'border-outline-variant/30 hover:shadow-md'}`}
          onClick={() => setExpandedCard(expandedCard === 'events' ? null : 'events')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600" style={{fontVariationSettings:"'FILL' 1"}}>event</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-black text-on-surface">{activeEvents.length}</p>
              <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${expandedCard === 'events' ? 'rotate-90' : ''}`}>chevron_right</span>
            </div>
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
            {(() => { const t = evtChecklists.length; return <div className="h-full bg-emerald-500 rounded-full" style={{ width: t === 0 ? '0%' : `${(evtChecklistsDone / t) * 100}%` }}></div>; })()}
          </div>
          {expandedCard === 'events' && (
            <div className="mt-5 border-t border-surface-container-high pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Events & Their Phases / Checklists</p>
              <div className="flex flex-col gap-4">
                {activeEvents.map(evt => {
                  const phases    = safeWorkItems.filter(w => w.container_id === evt.id && w.type === 'Phase').sort((a,b) => (a.expected_date||'').localeCompare(b.expected_date||''));
                  const topItems  = safeWorkItems.filter(w => w.container_id === evt.id && w.type !== 'Phase' && !w.parent_id);
                  const allChklst = safeWorkItems.filter(w => w.container_id === evt.id && w.type === 'Checklist');
                  const done      = allChklst.filter(w => w.status === 'Completed').length;
                  return (
                    <div key={evt.id} className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>event</span>
                        <span className="font-bold text-sm text-on-surface">{evt.title}</span>
                        <span className="ml-auto text-[10px] font-bold text-emerald-600">{done}/{allChklst.length} done</span>
                      </div>
                      {phases.length > 0 ? phases.map(ph => {
                        const phItems = safeWorkItems.filter(w => w.parent_id === ph.id);
                        return (
                          <div key={ph.id} className="mb-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">layers</span>{ph.title}
                              {ph.expected_date && <span className="ml-auto text-on-surface-variant font-medium">{ph.expected_date}</span>}
                            </p>
                            <div className="flex flex-col gap-1">
                              {phItems.map(ci => {
                                const ds = getDisplayStatus(ci);
                                return (
                                  <div key={ci.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-emerald-100/60 text-xs">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ds === 'Completed' ? 'bg-green-500' : ds === 'Overdue' ? 'bg-error' : ds === 'Ongoing' ? 'bg-blue-500' : 'bg-outline'}`} />
                                    <span className="flex-1 truncate font-medium text-on-surface">{ci.title}</span>
                                    <span className="text-on-surface-variant flex-shrink-0">{getAssigneeName(ci.assignee_id).split(' ')[0]}</span>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(ds)}`}>{ds}</span>
                                  </div>
                                );
                              })}
                              {phItems.length === 0 && <p className="text-xs text-on-surface-variant italic px-1">No items.</p>}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="flex flex-col gap-1">
                          {topItems.map(ci => {
                            const ds = getDisplayStatus(ci);
                            return (
                              <div key={ci.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-emerald-100/60 text-xs">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ds === 'Completed' ? 'bg-green-500' : ds === 'Overdue' ? 'bg-error' : ds === 'Ongoing' ? 'bg-blue-500' : 'bg-outline'}`} />
                                <span className="flex-1 truncate font-medium text-on-surface">{ci.title}</span>
                                <span className="text-on-surface-variant flex-shrink-0">{getAssigneeName(ci.assignee_id).split(' ')[0]}</span>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(ds)}`}>{ds}</span>
                              </div>
                            );
                          })}
                          {topItems.length === 0 && <p className="text-xs text-on-surface-variant italic px-1">No checklist items yet.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Split: Focus + Queue · Recent Activity ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Today's Focus */}
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full"></div>
                <h2 className="font-bold text-on-surface font-headline">Today's Focus</h2>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                {new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short'})}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {todaysFocus.length === 0 && <p className="text-sm text-on-surface-variant text-center py-6 italic">Nothing urgent today 🎉</p>}
              {todaysFocus.map(t => {
                const s = getDisplayStatus(t);
                const isOd = s === 'Overdue';
                const isNs = s === 'Not Started';
                const contTag = getFocusTag(t);
                const borderCls = isOd ? 'border-error bg-red-50' : isNs ? 'border-amber-400 bg-amber-50/50' : 'border-primary/30 bg-surface-container-low';
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${borderCls}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOd ? 'bg-red-100' : isNs ? 'bg-amber-100' : 'bg-primary/10'}`}>
                      <span className={`material-symbols-outlined text-[16px] ${isOd ? 'text-error' : isNs ? 'text-amber-600' : 'text-primary'}`} style={{fontVariationSettings:"'FILL' 1"}}>
                        {isOd ? 'warning' : isNs ? 'schedule' : 'today'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {contTag && <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${contTag.cls}`}>{contTag.label}</span>}
                        {t.priority && <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityCls(t.priority)}`}>{t.priority}</span>}
                        {t.expected_date && <span className="text-[10px] text-on-surface-variant">Due {t.expected_date}</span>}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusBadgeClass(s)}`}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Queue — Critical & High only */}
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-on-surface font-headline">Priority Queue</h2>
              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Critical · High</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-surface-container-high">
                    <th className="pb-2 text-left">Subject</th>
                    <th className="pb-2 text-left">Assignee</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {priorityQueue.map(t => {
                    const s = getDisplayStatus(t);
                    const c = t.container_id ? getContainer(t.container_id) : null;
                    return (
                      <tr key={t.id} className="text-sm">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'Critical' ? 'bg-error' : 'bg-orange-500'}`}></span>
                            <div className="min-w-0">
                              <span className="font-medium text-on-surface truncate block max-w-[180px]">{t.title}</span>
                              {c && <span className="text-[9px] text-indigo-600 truncate block">{c.title}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary">{getAvatarInitials(getAssigneeName(t.assignee_id))}</div>
                            <span className="text-on-surface-variant">{getAssigneeName(t.assignee_id).split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getStatusBadgeClass(s)}`}>{s}</span>
                        </td>
                        <td className="py-2.5 text-on-surface-variant">{t.expected_date || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {priorityQueue.length === 0 && <p className="text-center py-6 text-on-surface-variant text-sm italic">No critical or high priority items.</p>}
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
              {recentActivity.length === 0 && <p className="text-sm text-on-surface-variant italic text-center py-8">No activity yet.</p>}
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
