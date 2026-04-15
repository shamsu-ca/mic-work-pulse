import React, { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, getStatusBadgeClass } from '../../lib/statusUtils';

// Reusable Work Item Card for Kanban
function WorkItemCard({ item, showStart = false, showComplete = false, onStart, onComplete }) {
  const displayStatus = getDisplayStatus(item);
  const isUrgent = item.priority === 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/40 p-4 relative overflow-hidden group">
      {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>}
      <div className="flex justify-between items-start mb-2 ml-1">
        <h4 className="font-bold text-sm text-on-surface line-clamp-2 leading-tight">{item.title}</h4>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${isUrgent ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
           <span className="material-symbols-outlined text-[16px]">{item.type === 'Task' ? 'assignment' : (item.type === 'Milestone' ? 'flag' : 'checklist')}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 ml-1 mb-4">
        <span className="text-xs text-on-surface-variant flex items-center gap-1">
           <span className="material-symbols-outlined text-[14px]">event</span>
           {item.expected_date ? `Due: ${item.expected_date}` : 'No exact deadline'}
        </span>
      </div>
      
      {/* Actions */}
      <div className="ml-1 mt-auto flex gap-2">
         {showStart && (
           <button 
             className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
             onClick={() => onStart(item.id)}
           >
             START
           </button>
         )}
         {showComplete && (
           <button 
             className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
             onClick={() => onComplete(item.id)}
           >
             COMPLETE
           </button>
         )}
         {!showStart && !showComplete && (
           <span className="text-[10px] font-bold uppercase tracking-wider text-outline px-2 py-1 bg-surface-container rounded-md">
              {item.status}
           </span>
         )}
      </div>
    </div>
  );
}

export default function AssigneeDashboard() {
  const { currentUser, workItems, startWorkItem, completeWorkItem, getUnreadNotifications, markNotificationRead } = useDataContext();

  const safeWorkItems = workItems || [];
  const unreadNotifs = getUnreadNotifications() || [];
  
  // Assignee Privacy: Strict isolation using their ID
  const myItems = safeWorkItems.filter(w => w.assignee_id === currentUser.id);

  // Categories
  const overdueItems = myItems.filter(w => w.status === 'Overdue');
  const notStartedItems = myItems.filter(w => getDisplayStatus(w) === 'Not Started');
  const todayFocusItems = myItems.filter(w => w.priority <= 2 && w.status !== 'Completed').slice(0, 4);

  // Pipeline
  const assignedItems = myItems.filter(w => getDisplayStatus(w) === 'Assigned');
  const ongoingItems = myItems.filter(w => w.status === 'Ongoing');
  const dbCompletedItems = myItems.filter(w => w.status === 'Completed').slice(0, 5); // recent 5

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Welcome back, {(currentUser.name || 'User').split(' ')[0]}</h1>
          <p className="text-on-surface-variant font-medium text-sm">Here is your operational focus for today.</p>
        </div>
      </div>

      {/* Notifications Banner */}
      {unreadNotifs.length > 0 && (
         <div className="flex flex-col gap-2">
           {unreadNotifs.map(n => (
              <div key={n.id} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                 <div className="flex items-center gap-3 ml-2">
                    <span className="material-symbols-outlined text-primary">notifications_active</span>
                    <span className="text-sm font-medium text-on-surface">{n.message}</span>
                 </div>
                 <button 
                  className="px-4 py-1.5 bg-white text-primary text-xs font-bold rounded flex items-center gap-1 shadow-sm border border-outline-variant/30 hover:bg-surface-container transition-colors"
                  onClick={() => markNotificationRead(n.id)}
                 >
                   <span className="material-symbols-outlined text-[14px]">done</span> Dismiss
                 </button>
              </div>
           ))}
         </div>
      )}

      {/* Top Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-error/20 p-5 relative overflow-hidden flex flex-col">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
          <div className="flex items-center justify-between mb-4 ml-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error" style={{fontVariationSettings: "'FILL' 1"}}>crisis_alert</span>
              <h3 className="font-bold text-error uppercase text-xs tracking-widest">Immediate Action</h3>
            </div>
            <span className="px-2 py-0.5 bg-error/10 text-error font-extrabold text-xs rounded">{overdueItems.length}</span>
          </div>
          <div className="ml-2 flex flex-col gap-2 flex-1">
            {overdueItems.slice(0,3).map(w => (
              <div key={w.id} className="flex justify-between items-center border-b border-surface-container pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-semibold text-on-surface truncate pr-2">{w.title}</span>
                <button className="text-[10px] bg-error text-white font-bold px-2 py-1 rounded" onClick={() => startWorkItem(w.id)}>START</button>
              </div>
            ))}
            {overdueItems.length === 0 && <span className="text-sm font-medium text-slate-400 mt-2">Zero overdue items. Great work!</span>}
            {overdueItems.length > 3 && <span className="text-[10px] text-outline uppercase font-bold mt-2 text-center">+{overdueItems.length - 3} MORE</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-700/20 p-5 relative overflow-hidden flex flex-col">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-700"></div>
          <div className="flex items-center justify-between mb-4 ml-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-700" style={{fontVariationSettings: "'FILL' 1"}}>schedule</span>
              <h3 className="font-bold text-orange-700 uppercase text-xs tracking-widest">Not Started</h3>
            </div>
            <span className="px-2 py-0.5 bg-orange-700/10 text-orange-700 font-extrabold text-xs rounded">{notStartedItems.length}</span>
          </div>
          <div className="ml-2 flex flex-col gap-2 flex-1">
            {notStartedItems.slice(0,3).map(w => (
              <div key={w.id} className="flex justify-between items-center border-b border-surface-container pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-semibold text-on-surface truncate pr-2">{w.title}</span>
                <button className="text-[10px] bg-orange-700 text-white font-bold px-2 py-1 rounded" onClick={() => startWorkItem(w.id)}>START</button>
              </div>
            ))}
            {notStartedItems.length === 0 && <span className="text-sm font-medium text-slate-400 mt-2">All assigned items are ongoing.</span>}
            {notStartedItems.length > 3 && <span className="text-[10px] text-outline uppercase font-bold mt-2 text-center">+{notStartedItems.length - 3} MORE</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Work Pipeline Kanban */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
             <div className="p-5 border-b border-surface-container-high flex justify-between items-center">
                <h2 className="font-bold text-lg font-headline text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined">view_kanban</span> Work Pipeline
                </h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-surface-container-lowest">
                {/* Column: Assigned Today */}
                <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 min-h-[300px]">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-outline flex justify-between items-center px-1">
                      New / Assigned 
                      <span className="bg-white border border-outline-variant/50 text-on-surface-variant rounded-full text-[10px] px-2 py-0.5">{assignedItems.length}</span>
                   </h3>
                   {assignedItems.map(w => <WorkItemCard key={w.id} item={w} showStart={true} onStart={startWorkItem} />)}
                   {assignedItems.length === 0 && <div className="text-center p-6 border-2 border-dashed border-outline-variant/40 rounded-lg text-outline text-xs font-medium">No new assignments.</div>}
                </div>

                {/* Column: Ongoing */}
                <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 min-h-[300px]">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-outline flex justify-between items-center px-1">
                      Ongoing Activity
                      <span className="bg-white border border-outline-variant/50 text-on-surface-variant rounded-full text-[10px] px-2 py-0.5">{ongoingItems.length}</span>
                   </h3>
                   {ongoingItems.map(w => <WorkItemCard key={w.id} item={w} showComplete={true} onComplete={completeWorkItem} />)}
                   {ongoingItems.length === 0 && <div className="text-center p-6 border-2 border-dashed border-outline-variant/40 rounded-lg text-outline text-xs font-medium">No ongoing tasks.</div>}
                </div>
             </div>
          </div>
        </div>

        {/* Focus & Recent */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          
          {/* Today's Focus Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
             <div className="p-5 border-b border-surface-container-high bg-primary/5 border-l-4 border-l-primary">
                <h2 className="font-bold text-md font-headline text-on-surface">Today's Focus</h2>
                <p className="text-xs text-on-surface-variant mt-1">High priority tasks across pipeline</p>
             </div>
             <div className="p-4 flex flex-col gap-3">
                {todayFocusItems.map(w => (
                  <div key={w.id} className="flex flex-col gap-2 p-3 bg-surface border border-outline-variant/30 rounded-lg">
                     <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm text-on-surface">{w.title}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${w.priority === 1 ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
                           {w.priority === 1 ? 'URGENT' : 'STABLE'}
                        </span>
                     </div>
                     <span className="text-[10px] text-outline font-bold uppercase">{w.status}</span>
                  </div>
                ))}
                {todayFocusItems.length === 0 && <span className="text-sm text-outline">You have nothing high priority.</span>}
             </div>
          </div>

          {/* Completed / History */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden">
             <div className="p-5 border-b border-surface-container-high">
                <h2 className="font-bold text-md font-headline text-on-surface flex items-center gap-2">
                   <span className="material-symbols-outlined text-[18px]">history</span> Recent Completions
                </h2>
             </div>
             <div className="p-4 flex flex-col gap-3">
                {dbCompletedItems.map(w => (
                  <div key={w.id} className="flex gap-3 items-center">
                     <span className="material-symbols-outlined text-green-600 text-xl shrink-0">check_circle</span>
                     <div className="flex flex-col">
                        <span className="text-sm font-semibold text-on-surface line-clamp-1">{w.title}</span>
                        <span className="text-[10px] text-outline uppercase font-bold tracking-wider">DONE</span>
                     </div>
                  </div>
                ))}
                {dbCompletedItems.length === 0 && <span className="text-sm text-outline">No completions recently.</span>}
             </div>
          </div>
        
        </div>

      </div>
    </div>
  );
}
