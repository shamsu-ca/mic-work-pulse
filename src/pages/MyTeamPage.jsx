import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, getActionableUnits } from '../lib/statusUtils';
import CreateItemModal from '../components/common/CreateItemModal';

export default function MyTeamPage() {
  const { profiles, workItems, currentUser } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  const [selectedMember, setSelectedMember] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  // Team members reporting to this manager
  const myTeam = safeProfiles.filter(p =>
    p.manager === currentUser?.name && p.role !== 'Admin'
  );

  const getMemberTasks = (id) => getActionableUnits(safeWorkItems.filter(w => w.assignee_id === id));

  const getMetrics = (id) => {
    const tasks = getMemberTasks(id);
    const completed = tasks.filter(t => getDisplayStatus(t) === 'Completed').length;
    const overdue = tasks.filter(t => getDisplayStatus(t) === 'Overdue').length;
    const active = tasks.filter(t => !['Completed'].includes(getDisplayStatus(t))).length;
    const efficiency = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
    return { completed, overdue, active, total: tasks.length, efficiency, tasks };
  };

  const statusCls = (s) => {
    if (s === 'Overdue') return 'bg-red-100 text-red-700';
    if (s === 'Ongoing') return 'bg-blue-100 text-blue-700';
    if (s === 'Completed') return 'bg-green-100 text-green-700';
    return 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">My Team</h1>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          Assign Task
        </button>
      </div>

      {myTeam.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3 block">supervised_user_circle</span>
          <p className="font-bold text-on-surface">No team members yet.</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Ask an Admin to set your name as a team member's "Manager" in Staff Management.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team list */}
          <div className="md:col-span-1 flex flex-col gap-3">
            {myTeam.map(member => {
              const m = getMetrics(member.id);
              const isSelected = selectedMember?.id === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(isSelected ? null : member)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all shadow-sm ${isSelected ? 'border-primary shadow-md shadow-primary/10' : 'border-outline-variant/30 hover:shadow-md'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm">{getAvatarInitials(member.name)}</div>
                    }
                    <div>
                      <p className="font-bold text-on-surface">{member.name}</p>
                      <p className="text-xs text-on-surface-variant">{member.department || member.staff_group}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 text-center gap-2">
                    <div className="bg-surface-container rounded-lg py-1.5">
                      <p className="text-xs font-black text-on-surface">{m.active}</p>
                      <p className="text-[9px] text-on-surface-variant font-bold uppercase">Active</p>
                    </div>
                    <div className={`rounded-lg py-1.5 ${m.overdue > 0 ? 'bg-red-50' : 'bg-surface-container'}`}>
                      <p className={`text-xs font-black ${m.overdue > 0 ? 'text-error' : 'text-on-surface'}`}>{m.overdue}</p>
                      <p className="text-[9px] text-on-surface-variant font-bold uppercase">Overdue</p>
                    </div>
                    <div className="bg-green-50 rounded-lg py-1.5">
                      <p className="text-xs font-black text-green-700">{m.efficiency}%</p>
                      <p className="text-[9px] text-on-surface-variant font-bold uppercase">Done</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${m.efficiency}%` }}></div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="md:col-span-2">
            {!selectedMember ? (
              <div className="h-full bg-white rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-3">touch_app</span>
                <p className="font-bold">Select a team member to view details</p>
              </div>
            ) : (() => {
              const m = getMetrics(selectedMember.id);
              return (
                <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-surface-container">
                    <div className="flex items-center gap-4">
                      {selectedMember.avatar_url
                        ? <img src={selectedMember.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">{getAvatarInitials(selectedMember.name)}</div>
                      }
                      <div>
                        <p className="font-bold text-on-surface text-lg">{selectedMember.name}</p>
                        <p className="text-xs text-on-surface-variant">{selectedMember.department} · {selectedMember.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs: Active | All | History */}
                  <div className="px-5 pt-4 flex flex-col gap-3">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tasks ({m.total})</p>
                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                      {m.tasks.length === 0 && <p className="text-sm text-on-surface-variant italic text-center py-8">No tasks assigned.</p>}
                      {m.tasks.map(t => {
                        const s = getDisplayStatus(t);
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s === 'Overdue' ? 'bg-error' : s === 'Completed' ? 'bg-green-500' : 'bg-primary'}`}></span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                                <p className="text-[10px] text-on-surface-variant">{t.priority} · {t.expected_date || 'No due date'}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ml-2 ${statusCls(s)}`}>{s}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 pt-3">
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_task</span>
                      Assign New Task to {selectedMember.name.split(' ')[0]}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {isCreateOpen && <CreateItemModal onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}
