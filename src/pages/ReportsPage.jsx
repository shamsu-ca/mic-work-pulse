import React from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits } from '../lib/statusUtils';
import { isItemInDateRange } from '../lib/dateUtils';
import FilterBar from '../components/common/FilterBar';

export default function ReportsPage() {
  const { workItems, profiles, currentUser, dateFilter, customDateRange, staffGroup } = useDataContext();

  // Helpers
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  const getAssigneeName = (id) => {
    const p = safeProfiles.find(p => p.id === id);
    return p && p.name ? p.name : 'Unknown';
  };

  // --- Assignee View ---
  if (currentUser.role === 'Assignee') {
    // strict isolation
    const myItemsAll = safeWorkItems.filter(w => w.assignee_id === currentUser.id);
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
          <button className="bg-white border border-outline-variant/40 rounded-lg px-4 py-2 text-sm font-bold shadow-sm shadow-black/5 hover:bg-surface transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span> Download PDF
          </button>
        </div>

        {/* Assignee KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-primary to-secondary rounded-xl shadow-sm text-white p-6 relative overflow-hidden">
             <div className="absolute -right-6 -top-6 text-white/10">
               <span className="material-symbols-outlined text-[120px]">military_tech</span>
             </div>
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-2">Productivity Score</h3>
             <div className="flex items-baseline gap-2">
               <p className="text-5xl font-black font-headline">{productivityScore}%</p>
             </div>
             <p className="text-xs text-white/90 font-medium mt-4">Top 15% of your department!</p>
          </div>

           <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
              <div>
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Task Volume (Month)</h3>
                 <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-extrabold font-headline text-on-surface">{completed.length}</p>
                   <span className="text-sm font-bold text-on-surface-variant">/ {myItems.length}</span>
                 </div>
              </div>
              <div className="mt-4">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    <span>Progress</span>
                    <span className="text-primary">{productivityScore}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{width: `${productivityScore}%`}}></div>
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

        {/* Assignee Log Table */}
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
                      <th className="px-6 py-4 text-right">Completion Date</th>
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
                        <td className="px-6 py-4 text-right text-on-surface-variant">{w.status === 'Completed' ? (w.expected_date || 'Recently') : '-'}</td>
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

   // --- Admin View ---
   // Apply date filtering to work items
   const filteredAdminItems = safeWorkItems.filter(w => isItemInDateRange(w, dateFilter, customDateRange));
   // Only count actionable, non-recurring units
   const nonRecurringAdmin = filteredAdminItems.filter(w => !w.is_recurring);
   const actionableAdminItems = getActionableUnits(nonRecurringAdmin);

   const allCompleted = actionableAdminItems.filter(w => w.status === 'Completed');
   const allOverdue = actionableAdminItems.filter(w => isOverdue(w) && w.status !== 'Completed');
   const allNotStarted = actionableAdminItems.filter(w => w.status === 'Assigned');
   const allOngoing = actionableAdminItems.filter(w => w.status === 'Ongoing');

   // Group by Staff - filter by staff group too
   const staffArray = safeProfiles.filter(p => p.role !== 'Admin' && p.staff_group === staffGroup);
   const staffStats = staffArray.map(p => {
     const tasks = actionableAdminItems.filter(w => w.assignee_id === p.id);
     const comps = tasks.filter(w => w.status === 'Completed').length;
     const overdues = tasks.filter(w => isOverdue(w) && w.status !== 'Completed').length;
     const notStarts = tasks.filter(w => w.status === 'Assigned').length;
     const load = tasks.length;
     const effD = comps + overdues + notStarts;
     const score = effD === 0 ? 100 : Math.round((comps / effD) * 100);
     return { ...p, comps, overdues, notStarts, load, score };
   }).sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Reporting Dashboard</h1>
         </div>
        <div className="flex gap-4 items-center">
            <FilterBar showToggle={true} showDateFilter={true} />
            <button className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">download</span> Export Report
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5 border-l-4 border-primary flex items-center justify-between">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Assigned</p>
              <p className="text-3xl font-black font-headline text-on-surface">{allNotStarted.length}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">assignment_ind</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5 border-l-4 border-blue-500 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Ongoing</p>
              <p className="text-3xl font-black font-headline text-on-surface">{allOngoing.length}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><span className="material-symbols-outlined text-[20px]">autorenew</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5 border-l-4 border-green-500 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Completed</p>
              <p className="text-3xl font-black font-headline text-on-surface">{allCompleted.length}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><span className="material-symbols-outlined text-[20px]">check_circle</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5 border-l-4 border-error flex items-center justify-between">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Overdue</p>
              <p className="text-3xl font-black font-headline text-error">{allOverdue.length}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-error"><span className="material-symbols-outlined text-[20px]">warning</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5 border-l-4 border-amber-400 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Not Started</p>
              <p className="text-3xl font-black font-headline text-amber-600">{allNotStarted.length}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><span className="material-symbols-outlined text-[20px]">schedule</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Staff Performance Table */}
         <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-surface-container-high bg-surface-container-lowest">
               <h2 className="font-bold text-lg font-headline text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">groups</span> Staff Performance Leaderboard
               </h2>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                     <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4 text-center">Workload</th>
                        <th className="px-6 py-4 text-center">Done</th>
                        <th className="px-6 py-4 text-center">Overdue</th>
                        <th className="px-6 py-4 text-center">Not Started</th>
                        <th className="px-6 py-4 text-center">Efficiency</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low text-sm font-medium">
                     {staffStats.map(s => (
                       <tr key={s.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-surface-dim border border-outline-variant/40 flex items-center justify-center font-bold text-on-surface text-xs shadow-sm">
                                  {getAvatarInitials(s.name)}
                                </div>
                                <span className="font-semibold text-on-surface">{s.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">{s.load}</td>
                          <td className="px-6 py-4 text-center text-green-600">{s.comps}</td>
                          <td className="px-6 py-4 text-center text-error">{s.overdues > 0 ? s.overdues : '-'}</td>
                          <td className="px-6 py-4 text-center text-amber-600">{s.notStarts > 0 ? s.notStarts : '-'}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-center gap-2">
                               <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                  <div className={`h-full ${s.score >= 80 ? 'bg-green-500' : s.score >= 50 ? 'bg-orange-400' : 'bg-error'}`} style={{width: `${s.score}%`}}></div>
                               </div>
                               <span className="text-[10px] font-bold text-on-surface-variant w-6">{s.score}%</span>
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Latest Activity Log */}
         <div className="lg:col-span-1 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-surface-container-high bg-white">
               <h2 className="font-bold text-lg font-headline text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">history</span> Enterprise Log
               </h2>
            </div>
            <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[400px]">
               {safeWorkItems.slice(0, 10).map(w => (
                 <div key={w.id} className="flex gap-3 bg-white p-3 rounded-lg border border-outline-variant/30 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-dim flex shrink-0 items-center justify-center font-bold text-on-surface text-[10px]">
                      {getAvatarInitials(getAssigneeName(w.assignee_id))}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs font-semibold text-on-surface">{getAssigneeName(w.assignee_id).split(' ')[0]}</span>
                       <span className="text-[11px] text-on-surface-variant font-medium mt-0.5 leading-tight"><span className="text-[10px] uppercase font-bold text-primary mr-1">[{w.status}]</span>{w.title}</span>
                    </div>
                 </div>
               ))}
               {safeWorkItems.length === 0 && <span className="text-sm text-center text-outline mt-4">No data logged.</span>}
            </div>
         </div>
      </div>
    </div>
  );
}
