import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus } from '../lib/statusUtils';

export default function StaffOverviewPage() {
  const { profiles, workItems, containers, staffGroup } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Filter staff by the active staffGroup toggle AND non-Admin role
  const staffList = safeProfiles.filter(p => p.role !== 'Admin' && p.staff_group === staffGroup);
  
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getStaffMetrics = (staffId) => {
    const staffTasks = safeWorkItems.filter(item => item.assignee_id === staffId);
    
    let activeTasks = 0;
    let overdueTasks = 0;
    let completedTasks = 0;

    staffTasks.forEach(t => {
      const status = getDisplayStatus(t);
      if (status === 'Completed') completedTasks += 1;
      else if (status === 'Overdue') overdueTasks += 1;
      else activeTasks += 1; // Assigned, Not Started, Ongoing
    });

    const activeProjectIds = new Set(
       staffTasks
         .filter(t => t.container_id && getDisplayStatus(t) !== 'Completed')
         .map(t => t.container_id)
    );
    const activeProjects = activeProjectIds.size;

    const total = activeTasks + completedTasks + overdueTasks;
    const productivity = total === 0 ? 0 : Math.round((completedTasks / total) * 100);

    return { activeTasks, overdueTasks, completedTasks, activeProjects, productivity };
  };

  const filteredStaff = departmentFilter === 'All' 
    ? staffList 
    : staffList.filter(s => s.department === departmentFilter);

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Corporate Directory</h1>
          <p className="text-on-surface-variant font-medium text-sm">Manage staff allocation and productivity.</p>
        </div>
        <div className="flex gap-4 items-center">
            <select 
              className="bg-white border border-outline-variant/40 rounded-lg px-4 py-2 text-sm font-bold shadow-sm"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
               <option value="All">All Departments</option>
               <option value="Executive Management">Executive Management</option>
               <option value="Marketing">Marketing</option>
               <option value="Engineering">Engineering</option>
               <option value="Operations">Operations</option>
            </select>
            <button className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">add</span> Add Staff
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                   <th className="px-6 py-4">Employee</th>
                   <th className="px-6 py-4">Current Status</th>
                   <th className="px-6 py-4 text-center">Active Tasks</th>
                   <th className="px-6 py-4 text-center">Projects</th>
                   <th className="px-6 py-4">Productivity</th>
                   <th className="px-6 py-4 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-surface-container-low text-sm">
                {filteredStaff.map(staff => {
                  const metrics = getStaffMetrics(staff.id);
                  const isOverloaded = metrics.overdueTasks > 0;
                  
                  return (
                    <tr key={staff.id} className="hover:bg-surface-container-low/50 transition-colors group">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center font-bold text-on-surface shadow-sm">
                               {getAvatarInitials(staff.name)}
                             </div>
                             <div>
                                <p className="font-bold text-on-surface text-sm">{staff.name}</p>
                                <p className="text-xs text-on-surface-variant font-medium">{staff.department || 'No department'}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          {isOverloaded ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-error-container/50 text-on-error-container text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Overloaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Active
                            </span>
                          )}
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-on-surface">
                          {metrics.activeTasks}
                          {metrics.overdueTasks > 0 && <span className="text-error text-xs ml-1">({metrics.overdueTasks} late)</span>}
                       </td>
                       <td className="px-6 py-4 text-center text-on-surface-variant font-medium">
                          {metrics.activeProjects}
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-full max-w-[100px] h-2 bg-surface-container-high rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{width: `${metrics.productivity}%`}}></div>
                             </div>
                             <span className="text-xs font-bold text-on-surface-variant w-8">{metrics.productivity}%</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="h-8 w-8 rounded-full hover:bg-surface-dim text-on-surface-variant flex items-center justify-center transition-colors">
                             <span className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>
                       </td>
                    </tr>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-on-surface-variant font-medium text-sm">
                      No staff members found in this department.
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
