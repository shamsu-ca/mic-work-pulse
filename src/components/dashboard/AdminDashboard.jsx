import React from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, getStatusBadgeClass } from '../../lib/statusUtils';


export default function AdminDashboard({ staffGroup }) {
  const { profiles, workItems, containers } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];
  
  const filteredStaff = safeProfiles.filter(p => p.staff_group === staffGroup && p.role !== 'Admin');

  // Helpers
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAssigneeName = (id) => {
    const p = safeProfiles.find(p => p.id === id);
    return p && p.name ? p.name : 'Unassigned';
  };

  // Metrics
  const overdueCounts = filteredStaff.map(p => {
    const count = safeWorkItems.filter(w => w.assignee_id === p.id && w.status === 'Overdue').length;
    return count > 0 ? { id: p.id, name: p.name, count } : null;
  }).filter(Boolean);

  const notStartedCounts = filteredStaff.map(p => {
    const count = safeWorkItems.filter(w => w.assignee_id === p.id && getDisplayStatus(w) === 'Not Started').length;
    return count > 0 ? { id: p.id, name: p.name, count } : null;
  }).filter(Boolean);

  const stats = {
    tasks: {
      total: safeWorkItems.filter(w => w.type === 'Task' || w.type === 'Subtask').length,
      assigned: safeWorkItems.filter(w => (w.type === 'Task' || w.type === 'Subtask') && (w.status === 'Assigned' || w.status === 'Not Started' || w.status === 'Overdue')).length,
      ongoing: safeWorkItems.filter(w => (w.type === 'Task' || w.type === 'Subtask') && w.status === 'Ongoing').length,
      done: safeWorkItems.filter(w => (w.type === 'Task' || w.type === 'Subtask') && w.status === 'Completed').length,
    },
    projects: {
      total: safeContainers.filter(c => c.type === 'Project').length,
      planned: safeContainers.filter(c => c.type === 'Project' && c.progress === 0).length,
      active: safeContainers.filter(c => c.type === 'Project' && c.progress > 0 && c.progress < 100).length,
      closed: safeContainers.filter(c => c.type === 'Project' && c.progress === 100).length,
    },
    events: {
      total: safeContainers.filter(c => c.type === 'Event').length,
      invites: safeContainers.filter(c => c.type === 'Event' && c.progress < 50).length,
      live: safeContainers.filter(c => c.type === 'Event' && c.progress >= 50 && c.progress < 100).length,
      ended: safeContainers.filter(c => c.type === 'Event' && c.progress === 100).length,
    }
  };

  const todaysFocus = safeWorkItems.filter(w => w.priority <= 2 && w.status !== 'Completed').slice(0, 3);
  const priorityQueue = safeWorkItems.filter(w => w.status !== 'Completed' && !w.in_planning_pool).sort((a,b) => a.priority - b.priority).slice(0, 4);
  const recentActivity = safeWorkItems.filter(w => w.status === 'Completed').slice(0, 4); // mock activity

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">System Overview</h1>
          <p className="text-on-surface-variant font-medium text-sm">Real-time enterprise performance metrics</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-white border border-outline-variant/40 rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Today
            <span className="material-symbols-outlined text-[16px] ml-1">expand_more</span>
          </div>
        </div>
      </div>

      {/* Top Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-error/20 p-6 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-error"></div>
          <div className="flex items-center gap-3 mb-6 ml-2">
            <div className="w-10 h-10 bg-error/10 text-error rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
            </div>
            <div>
              <h3 className="font-bold text-error uppercase text-sm tracking-widest">Critical Overdue</h3>
              <p className="text-xs text-on-surface-variant font-medium">10 tasks requiring immediate attention</p>
            </div>
          </div>
          <div className="flex items-center gap-6 ml-2">
            {overdueCounts.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline flex items-center justify-center text-xs font-bold">
                   {getAvatarInitials(c.name)}
                 </div>
                 <div className="flex flex-col items-center">
                   <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">{(c.name || 'User').split(' ')[0]}</span>
                   <span className="text-error font-extrabold text-sm">{c.count}</span>
                 </div>
              </div>
            ))}
            {overdueCounts.length === 0 && <span className="text-sm font-medium text-slate-400">No overdue items.</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-700/20 p-6 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-700"></div>
          <div className="flex items-center gap-3 mb-6 ml-2">
            <div className="w-10 h-10 bg-orange-700/10 text-orange-700 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>pending</span>
            </div>
            <div>
              <h3 className="font-bold text-orange-700 uppercase text-sm tracking-widest">Not Started</h3>
              <p className="text-xs text-on-surface-variant font-medium">High priority items pending kick-off</p>
            </div>
          </div>
          <div className="flex items-center gap-6 ml-2">
            {notStartedCounts.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline flex items-center justify-center text-xs font-bold">
                   {getAvatarInitials(c.name)}
                 </div>
                 <div className="flex flex-col items-center">
                   <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">{c.name.split(' ')[0]}</span>
                   <span className="text-orange-700 font-extrabold text-sm">{c.count}</span>
                 </div>
              </div>
            ))}
            {notStartedCounts.length === 0 && <span className="text-sm font-medium text-slate-400">All fast-tracked.</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
             <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
               <span className="material-symbols-outlined">assignment</span>
             </div>
             <div className="text-right">
               <h2 className="text-3xl font-black text-on-surface font-headline">{stats.tasks.total}</h2>
               <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Total Tasks</p>
             </div>
          </div>
          <div>
            <div className="grid grid-cols-3 gap-2 mb-3">
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Assigned</p>
                 <p className="text-lg font-bold text-on-surface">{stats.tasks.assigned}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Ongoing</p>
                 <p className="text-lg font-bold text-primary">{stats.tasks.ongoing}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Done</p>
                 <p className="text-lg font-bold text-green-600">{stats.tasks.done}</p>
               </div>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden flex">
               <div className="bg-on-surface h-full" style={{width: `${(stats.tasks.assigned/stats.tasks.total)*100}%`}}></div>
               <div className="bg-primary h-full" style={{width: `${(stats.tasks.ongoing/stats.tasks.total)*100}%`}}></div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
             <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center">
               <span className="material-symbols-outlined">account_tree</span>
             </div>
             <div className="text-right">
               <h2 className="text-3xl font-black text-on-surface font-headline">{stats.projects.total < 10 ? `0${stats.projects.total}` : stats.projects.total}</h2>
               <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Active Projects</p>
             </div>
          </div>
          <div>
            <div className="grid grid-cols-3 gap-2 mb-3">
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Planned</p>
                 <p className="text-lg font-bold text-on-surface">0{stats.projects.planned}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Active</p>
                 <p className="text-lg font-bold text-blue-600">0{stats.projects.active}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Closed</p>
                 <p className="text-lg font-bold text-green-600">0{stats.projects.closed}</p>
               </div>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden flex">
               <div className="bg-blue-600 h-full w-2/3"></div>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
             <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
               <span className="material-symbols-outlined">calendar_today</span>
             </div>
             <div className="text-right">
               <h2 className="text-3xl font-black text-on-surface font-headline">{stats.events.total < 10 ? `0${stats.events.total}` : stats.events.total}</h2>
               <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Scheduled Events</p>
             </div>
          </div>
          <div>
            <div className="grid grid-cols-3 gap-2 mb-3">
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Invites</p>
                 <p className="text-lg font-bold text-on-surface">0{stats.events.invites}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Live</p>
                 <p className="text-lg font-bold text-on-surface-variant">0{stats.events.live}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Ended</p>
                 <p className="text-lg font-bold text-green-600">0{stats.events.ended}</p>
               </div>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden flex">
               <div className="bg-slate-700 h-full w-3/4"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Content Col */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Today's Focus */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
             <div className="p-6 border-b border-surface-container-high flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                   <h2 className="font-bold text-lg font-headline text-on-surface">Today's Focus</h2>
                </div>
                <span className="px-3 py-1 bg-surface-container text-primary font-bold text-[10px] uppercase tracking-wider rounded-full">High Priority</span>
             </div>
             <div className="p-6 flex flex-col gap-4">
                {todaysFocus.map(w => (
                  <div key={w.id} className="flex items-center justify-between p-4 bg-white border border-outline-variant/40 rounded-xl hover:shadow-md transition-shadow group relative overflow-hidden">
                     <div className={`absolute left-0 top-0 bottom-0 w-1 ${w.priority === 1 ? 'bg-error' : 'bg-primary'}`}></div>
                     <div className="flex items-center gap-4 ml-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.priority === 1 ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                           <span className="material-symbols-outlined text-lg">{w.type === 'Task' ? 'assignment' : (w.type === 'Milestone' ? 'flag' : 'checklist')}</span>
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] uppercase font-bold text-outline tracking-wider">{w.type} • {w.status}</span>
                           </div>
                           <h4 className="font-bold text-sm text-on-surface">{w.title}</h4>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-[10px] font-black uppercase tracking-wider ${w.priority === 1 ? 'text-error' : 'text-primary'}`}>{w.priority === 1 ? 'URGENT' : 'STABLE'}</p>
                        <p className="text-xs text-on-surface-variant font-medium mt-1">{w.expected_date ? `Due ${w.expected_date}` : 'No deadline'}</p>
                     </div>
                  </div>
                ))}
                {todaysFocus.length === 0 && <p className="text-sm text-outline font-medium text-center py-4">No critical tasks pending.</p>}
             </div>
          </div>

          {/* Priority Queue */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
             <div className="p-6 border-b border-surface-container-high flex justify-between items-center">
                <h2 className="font-bold text-lg font-headline text-on-surface">Priority Queue</h2>
                <div className="flex gap-2">
                   <button className="h-8 w-8 border border-outline-variant/50 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-dim"><span className="material-symbols-outlined text-[16px]">filter_list</span></button>
                   <button className="h-8 w-8 border border-outline-variant/50 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-dim"><span className="material-symbols-outlined text-[16px]">sort</span></button>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                     <tr>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Assigned</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Deadline</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low text-sm font-medium">
                     {priorityQueue.map(w => (
                       <tr key={w.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${w.priority === 1 ? 'bg-error' : 'bg-primary'}`}></span>
                             <span className="text-on-surface font-semibold">{w.title}</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-surface-dim flex items-center justify-center text-[9px] font-bold">
                                 {getAvatarInitials(getAssigneeName(w.assignee_id))}
                               </div>
                               <span className="text-on-surface">{getAssigneeName(w.assignee_id).split(' ')[0]}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${w.status === 'Overdue' ? 'bg-error-container text-on-error-container' : (w.status === 'Not Started' ? 'bg-orange-100 text-orange-700' : 'bg-primary-container/20 text-primary')}`}>
                                {w.status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right text-on-surface-variant">
                             {w.expected_date || 'None'}
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
               {priorityQueue.length === 0 && <p className="text-sm text-outline font-medium text-center py-6 border-b border-surface-container-high/50">Priority queue is empty.</p>}
             </div>
          </div>
        </div>

        {/* Right Sidebar Col */}
        <div className="xl:col-span-1 flex flex-col gap-6">
           <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col h-full">
              <div className="p-6 border-b border-surface-container-high flex justify-between items-center">
                 <h2 className="font-bold text-lg font-headline text-on-surface">Recent Activity</h2>
                 <span className="text-[10px] font-bold text-primary uppercase tracking-widest cursor-pointer">View All</span>
              </div>
              <div className="p-6 flex-1">
                 <div className="relative border-l border-outline-variant/30 ml-3 space-y-8">
                    {recentActivity.map((w, idx) => (
                      <div key={w.id} className="relative pl-6">
                         <div className="absolute -left-[9px] bg-white p-0.5 rounded-full">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined shrink-0" style={{fontSize: '8px'}}>{idx % 2 === 0 ? 'check' : ''}</span>
                            </div>
                         </div>
                         <div>
                            <p className="text-sm font-medium text-on-surface">
                              <span className="font-bold">{getAssigneeName(w.assignee_id).split(' ')[0]}</span> completed task <span className="font-semibold text-primary">{w.title}</span>
                            </p>
                            <p className="text-[10px] text-outline font-bold uppercase mt-1">Recently</p>
                         </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && <p className="ml-6 text-sm text-outline">No recent activity.</p>}
                 </div>
              </div>
              <div className="p-6 bg-primary text-white rounded-b-xl flex justify-between items-end">
                 <div>
                    <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest mb-1">Weekly Efficiency</p>
                    <p className="text-3xl font-black font-headline">+12.5%</p>
                    <p className="text-[10px] text-white/80 font-medium mt-1">Above last quarter average</p>
                 </div>
                 <span className="material-symbols-outlined text-4xl text-white/20">trending_up</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
