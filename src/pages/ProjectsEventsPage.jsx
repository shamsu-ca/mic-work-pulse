import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import CreateModal from '../components/common/CreateModal';

export default function ProjectsEventsPage() {
  const { containers, workItems, profiles, currentUser, addContainer } = useDataContext();
  const [typeTab, setTypeTab] = useState('Projects');    // Projects | Events
  const [modeTab, setModeTab] = useState('Active');      // Active | Saved Templates
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const safeContainers = containers || [];
  const safeWorkItems = workItems || [];
  const safeProfiles = profiles || [];

  const getInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getProfile = (id) => safeProfiles.find(p => p.id === id);
  const getLeadName = (id) => getProfile(id)?.name || 'Unassigned';

  let allContainers = safeContainers;
  if (currentUser?.role === 'Assignee') {
    allContainers = allContainers.filter(c => c.created_by === currentUser.id);
  }

  const filteredType = typeTab === 'Projects'
    ? allContainers.filter(c => c.type === 'Project')
    : allContainers.filter(c => c.type === 'Event');

  const activeItems = filteredType.filter(c => !(c.is_template));
  const templateItems = filteredType.filter(c => c.is_template);
  const displayList = modeTab === 'Active' ? activeItems : templateItems;

  const getContainerTasks = (id) => safeWorkItems.filter(w => w.container_id === id);

  const progressColor = (p) => {
    if (p >= 80) return 'bg-green-500';
    if (p >= 40) return 'bg-primary';
    return 'bg-amber-400';
  };

  const statusLabel = (c) => {
    const p = c.progress || 0;
    if (p === 0) return { label: 'Planned', cls: 'bg-surface-container text-on-surface-variant' };
    if (p === 100) return { label: 'Completed', cls: 'bg-green-100 text-green-700' };
    return { label: 'Ongoing', cls: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Portfolio Dashboard</h1>
          <p className="text-on-surface-variant font-medium text-sm">Strategic overview of all key initiatives and events.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New {typeTab === 'Projects' ? 'Project' : 'Event'}
          </button>
        </div>
      </div>

      {/* Type Tabs: Projects | Events */}
      <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit">
        {['Projects', 'Events'].map(t => (
          <button
            key={t}
            onClick={() => setTypeTab(t)}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${typeTab === t ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mode Tabs: Active | Saved Templates */}
      <div className="flex gap-6 border-b border-surface-container-high">
        {['Active', 'Saved Templates'].map(m => (
          <button
            key={m}
            onClick={() => setModeTab(m)}
            className={`pb-3 text-sm font-bold tracking-wide transition-colors relative ${modeTab === m ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {m}
            {modeTab === m && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
          </button>
        ))}
      </div>

      {/* Saved Templates Mode */}
      {modeTab === 'Saved Templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templateItems.length === 0 && (
            <div className="col-span-2 text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block">library_books</span>
              <p className="font-bold">No saved templates yet.</p>
              <p className="text-sm mt-1">Create a project or event and save it as a template.</p>
            </div>
          )}
          {templateItems.map(c => {
            const { label, cls } = statusLabel(c);
            const tasks = getContainerTasks(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border-2 border-outline-variant/30 p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>{typeTab === 'Projects' ? 'folder_open' : 'event'}</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{c.name}</p>
                      <p className="text-[10px] text-on-surface-variant">Template · {tasks.length} checklist items</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">TEMPLATE</span>
                </div>
                {c.description && <p className="text-sm text-on-surface-variant">{c.description}</p>}
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 py-2 text-sm font-bold border border-outline-variant/40 rounded-xl hover:bg-surface-container transition-colors">View Structure</button>
                  <button className="flex-1 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 transition-opacity">Start</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Mode */}
      {modeTab === 'Active' && (
        <div className="flex flex-col gap-4">
          {displayList.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant bg-white rounded-2xl border border-outline-variant/30">
              <span className="material-symbols-outlined text-5xl mb-3 block">{typeTab === 'Projects' ? 'folder_open' : 'event'}</span>
              <p className="font-bold">No active {typeTab.toLowerCase()} yet.</p>
              <p className="text-sm mt-1">Click "New {typeTab === 'Projects' ? 'Project' : 'Event'}" to get started.</p>
            </div>
          )}
          {displayList.map(c => {
            const progress = c.progress || 0;
            const { label, cls } = statusLabel(c);
            const tasks = getContainerTasks(c.id);
            const isExpanded = expandedId === c.id;

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-surface-container-low/40 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>{typeTab === 'Projects' ? 'folder_open' : 'event'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-on-surface">{c.name}</p>
                          <span className="text-[9px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-1.5 py-0.5 rounded">
                            {typeTab === 'Projects' ? 'PROJECT' : 'EVENT'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                          {c.lead_id && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">person</span>
                              Lead: {getLeadName(c.lead_id)}
                            </span>
                          )}
                          {c.expected_date && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                              {c.expected_date}
                            </span>
                          )}
                          <span>{tasks.length} tasks</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-black text-on-surface">{progress}%</p>
                        <p className="text-[10px] text-on-surface-variant">Overall</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${progressColor(progress)}`} style={{ width: `${progress}%` }}></div>
                    </div>
                    {tasks.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        {tasks.filter(t => t.status === 'Completed').length} tasks completed · {tasks.length - tasks.filter(t => t.status === 'Completed').length} remaining
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded Task List */}
                {isExpanded && tasks.length > 0 && (
                  <div className="border-t border-surface-container-high px-5 py-4">
                    <div className="grid grid-cols-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-2 border-b border-surface-container-low mb-2">
                      <span className="col-span-2">Checklist Item</span>
                      <span>Assignee</span>
                      <span className="text-right">Status</span>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                      {tasks.map(t => {
                        const isDone = t.status === 'Completed';
                        const assignee = getProfile(t.assignee_id);
                        return (
                          <div key={t.id} className="grid grid-cols-4 items-center py-2 text-sm">
                            <div className="col-span-2 flex items-center gap-2">
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'border-green-500 bg-green-500' : 'border-outline-variant'}`}>
                                {isDone && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                              </span>
                              <span className={`font-medium truncate ${isDone ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{t.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {assignee && (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary flex-shrink-0">
                                  {getInitials(assignee.name)}
                                </div>
                              )}
                              <span className="text-xs text-on-surface-variant truncate">{assignee ? assignee.name.split(' ')[0] : '—'}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isDone ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                                {t.status || 'Assigned'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {isExpanded && tasks.length === 0 && (
                  <div className="border-t border-surface-container-high px-5 py-4 text-center text-sm text-on-surface-variant italic">No tasks added yet.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <CreateModal
          defaultType={typeTab === 'Projects' ? 'Project' : 'Event'}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
