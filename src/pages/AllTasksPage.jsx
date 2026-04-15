import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus } from '../lib/statusUtils';
import CreateModal from '../components/common/CreateModal';

export default function AllTasksPage() {
  const { workItems, profiles, currentUser, containers } = useDataContext();
  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  const getAssigneeName = (id) => {
    const p = safeProfiles.find(p => p.id === id);
    return p && p.name ? p.name : 'Unassigned';
  };

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Filter out Planning Pool
  let baseItems = safeWorkItems.filter(w => !w.in_planning_pool);
  
  if (currentUser.role === 'Assignee') {
    // Only see my items
    baseItems = baseItems.filter(w => w.assignee_id === currentUser.id);
  }

  // Determine lists matching the requested Tabs
  const activeItems = baseItems.filter(w => !w.is_recurring && (w.status === 'Ongoing' || w.status === 'Overdue'));
  const upcomingItems = baseItems.filter(w => !w.is_recurring && (getDisplayStatus(w) === 'Assigned' || getDisplayStatus(w) === 'Not Started'));
  const completedItems = baseItems.filter(w => !w.is_recurring && w.status === 'Completed');
  const recurringItems = baseItems.filter(w => w.is_recurring);

  let displayList = [];
  if (activeTab === 'Active') displayList = activeItems;
  if (activeTab === 'Upcoming') displayList = upcomingItems;
  if (activeTab === 'Recurring') displayList = recurringItems;
  if (activeTab === 'History') displayList = completedItems;

  if (searchQuery) {
    displayList = displayList.filter(w => w.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Work Management Centre</h1>
          <p className="text-on-surface-variant font-medium text-sm">Comprehensive view of all operational tasks.</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="relative">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
               <input 
                 type="text" 
                 placeholder="Search tasks..." 
                 className="w-64 bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
            {currentUser.role === 'Admin' && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> New Task
              </button>
            )}
        </div>
      </div>

      <div className="flex gap-6 border-b border-surface-container-high overflow-x-auto no-scrollbar">
        {['Active', 'Upcoming', 'Recurring', 'History'].map(tab => (
          <button 
            key={tab}
            className={`pb-3 text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            onClick={() => setActiveTab(tab)}
          >
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></span>}
            {tab}
            {tab === 'Active' && <span className="ml-2 bg-primary-container text-on-primary-container text-[10px] px-1.5 py-0.5 rounded-full">{activeItems.length}</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mt-2">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                   <tr>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4 text-center">Type</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      {currentUser.role === 'Admin' && <th className="px-6 py-4">Assignee</th>}
                      <th className="px-6 py-4 text-right">Deadline</th>
                      <th className="px-6 py-4 text-right w-16"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-sm font-medium">
                   {displayList.map(w => (
                     <tr key={w.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <div className={`shrink-0 w-2 h-2 rounded-full ${w.priority === 1 ? 'bg-error' : 'bg-primary'}`}></div>
                              <span className="text-on-surface font-semibold leading-tight line-clamp-1">{w.title}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className="text-xs text-on-surface-variant border border-outline-variant/40 bg-surface px-2 py-0.5 rounded">{w.type}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                             w.status === 'Overdue' ? 'bg-error-container text-on-error-container' : 
                             w.status === 'Completed' ? 'bg-green-100 text-green-800' :
                             w.status === 'Ongoing' ? 'bg-primary-container text-on-primary-container' :
                             'bg-surface-container text-on-surface-variant'
                           }`}>
                              {getDisplayStatus(w)}
                           </span>
                        </td>
                        {currentUser.role === 'Admin' && (
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2 text-on-surface-variant">
                               <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/40 flex items-center justify-center text-[9px] font-bold text-on-surface shadow-sm">
                                 {getAvatarInitials(getAssigneeName(w.assignee_id))}
                               </div>
                               {getAssigneeName(w.assignee_id).split(' ')[0]}
                             </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right text-on-surface-variant font-semibold">
                           {activeTab === 'History' ? 'Finished' : (w.expected_date || 'No Date')}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="h-8 w-8 rounded-full hover:bg-surface-dim text-on-surface-variant flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                           </button>
                        </td>
                     </tr>
                   ))}
                   {displayList.length === 0 && (
                     <tr>
                        <td colSpan={currentUser.role === 'Admin' ? 6 : 5} className="px-6 py-16 text-center">
                           <span className="material-symbols-outlined text-4xl text-outline mb-3">data_alert</span>
                           <p className="text-on-surface-variant font-bold">No tasks found matching your criteria.</p>
                        </td>
                     </tr>
                   )}
                </tbody>
             </table>
           </div>
      </div>

      <CreateModal 
         isOpen={isCreateOpen}
         onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
