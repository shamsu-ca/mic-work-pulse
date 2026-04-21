import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getActionableUnits } from '../lib/statusUtils';
import CreateModal from '../components/common/CreateModal';

export default function PlanningPage() {
  const { workItems, profiles, updateWorkItem } = useDataContext();
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [allocationAssignee, setAllocationAssignee] = useState('');
  const [allocationDate, setAllocationDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  const getCreatorName = (authorId) => {
    const p = safeProfiles.find(p => p.id === authorId);
    return p && p.name ? p.name : 'Unknown';
  };

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // The Planning Pool only shows unassigned standard tasks that are in the pool.
  const planningPoolRaw = safeWorkItems.filter(w => w.in_planning_pool && !w.is_recurring);
  const planningPool = getActionableUnits(planningPoolRaw);

  const toggleTaskSelection = (id) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter(tId => tId !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleAllocate = async () => {
    if (selectedTaskIds.length === 0 || !allocationAssignee || !allocationDate) return;
    
    // Allocate selected tasks
    for (const taskId of selectedTaskIds) {
       await updateWorkItem(taskId, {
          assignee_id: allocationAssignee,
          expected_date: allocationDate,
          in_planning_pool: false,
          status: 'Not Started'
       });
    }
    
    setSelectedTaskIds([]);
    setAllocationAssignee('');
    setAllocationDate('');
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Task Allocation Pool</h1>
        </div>
        <div className="flex gap-4 items-center">
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> Add To Pool
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: The Pool Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden">
           <div className="p-5 border-b border-surface-container-high flex justify-between items-center bg-surface-container-lowest">
              <h2 className="font-bold text-lg font-headline text-on-surface flex items-center gap-2">
                 <span className="material-symbols-outlined text-[20px]">inbox</span> Items Pending Allocation
              </h2>
              <span className="bg-surface-container text-on-surface text-xs font-bold px-2 py-1 rounded">{planningPool.length} Items</span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                   <tr>
                      <th className="px-6 py-4 w-12"></th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Added By</th>
                      <th className="px-6 py-4 text-center">Priority</th>
                      <th className="px-6 py-4 text-right">Age</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-sm font-medium">
                   {planningPool.map(w => (
                     <tr key={w.id} className={`transition-colors cursor-pointer ${selectedTaskIds.includes(w.id) ? 'bg-primary/5' : 'hover:bg-surface-container-low/50'}`} onClick={() => toggleTaskSelection(w.id)}>
                        <td className="px-6 py-4">
                           <div className={`w-5 h-5 rounded border ${selectedTaskIds.includes(w.id) ? 'bg-primary border-primary flex items-center justify-center' : 'border-outline-variant bg-white'}`}>
                              {selectedTaskIds.includes(w.id) && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                           </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-on-surface">{w.title}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2 text-on-surface-variant">
                             <div className="w-6 h-6 rounded bg-surface-dim border border-outline-variant/40 flex items-center justify-center text-[9px] font-bold text-on-surface">
                               {getAvatarInitials(getCreatorName(w.created_by))}
                             </div>
                             {getCreatorName(w.created_by).split(' ')[0]}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${w.priority === 1 ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'}`}>
                              {w.priority === 1 ? 'URGENT' : 'NORMAL'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right text-on-surface-variant">
                           {w.aging || 'New'}
                        </td>
                     </tr>
                   ))}
                   {planningPool.length === 0 && (
                     <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                           <span className="material-symbols-outlined text-4xl text-outline mb-2">done_all</span>
                           <p className="text-on-surface-variant font-medium">Pool is empty. Everything is allocated.</p>
                        </td>
                     </tr>
                   )}
                </tbody>
             </table>
           </div>
        </div>

        {/* Right Col: Allocation Form */}
        <div className="lg:col-span-1">
           <div className={`bg-white rounded-xl shadow-sm border ${selectedTaskIds.length > 0 ? 'border-primary shadow-md shadow-primary/10' : 'border-outline-variant/30'} flex flex-col sticky top-24 transition-all duration-300`}>
              <div className={`p-5 border-b border-surface-container-high transition-colors ${selectedTaskIds.length > 0 ? 'bg-primary/5' : 'bg-surface-container-lowest'}`}>
                 <h2 className="font-bold text-lg font-headline text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">person_add</span> Quick Allocation
                 </h2>
              </div>
              <div className="p-6 flex flex-col gap-5">
                 
                 <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Selected Tasks</label>
                    <div className="bg-surface-dim/30 border border-outline-variant/40 rounded-lg p-3 text-sm font-bold text-on-surface flex items-center gap-2">
                       <span className="w-6 h-6 bg-primary text-white rounded flex items-center justify-center text-xs font-black">{selectedTaskIds.length}</span>
                       items selected
                    </div>
                 </div>

                 <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Assign To Staff</label>
                    <div className="relative">
                       <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">person</span>
                       <select 
                         className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-colors appearance-none"
                         value={allocationAssignee}
                         onChange={(e) => setAllocationAssignee(e.target.value)}
                       >
                          <option value="">Select an assignee...</option>
                          {profiles.filter(p => p.role !== 'Admin').map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                       </select>
                       <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Target Date</label>
                    <div className="relative">
                       <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">calendar_month</span>
                       <input 
                         type="date"
                         className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                         value={allocationDate}
                         onChange={(e) => setAllocationDate(e.target.value)}
                       />
                    </div>
                 </div>

                 <button 
                   className={`mt-4 py-3 rounded-lg text-sm font-bold shadow-sm transition-all flex justify-center items-center gap-2 ${
                     selectedTaskIds.length > 0 && allocationAssignee && allocationDate
                       ? 'bg-primary text-white hover:opacity-90 active:scale-95' 
                       : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                   }`}
                   onClick={handleAllocate}
                   disabled={!(selectedTaskIds.length > 0 && allocationAssignee && allocationDate)}
                 >
                   <span className="material-symbols-outlined text-[18px]">send</span> Let's Go
                 </button>
              </div>
           </div>
        </div>
      </div>
      
      <CreateModal 
         isOpen={isCreateOpen}
         onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
