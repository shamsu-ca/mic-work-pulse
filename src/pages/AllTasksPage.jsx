import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, getStatusBadgeClass, getActionableUnits, isOverdue } from '../lib/statusUtils';
import FilterBar from '../components/common/FilterBar';

// Priority helpers — stored as integers (1=Critical 2=High 3=Medium 4=Low)
const PRIORITY_LABEL = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
const PRIORITY_COLOR = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-surface-container text-on-surface-variant',
};
const getPriorityLabel = (p) =>
  PRIORITY_LABEL[p] ?? (typeof p === 'string' ? p : 'Medium');
const getPriorityColor = (p) => {
  if (typeof p === 'number') return PRIORITY_COLOR[p] ?? PRIORITY_COLOR[4];
  if (p === 'Critical') return PRIORITY_COLOR[1];
  if (p === 'High') return PRIORITY_COLOR[2];
  if (p === 'Medium') return PRIORITY_COLOR[3];
  return PRIORITY_COLOR[4];
};

const getRecurrenceLabel = (rule) => {
  if (!rule) return 'Custom';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (rule.type === 'daily') return 'Daily';
  if (rule.type === 'weekly') return `Weekly (${days[rule.day] ?? 'Mon'})`;
  if (rule.type === 'monthly') return `Monthly (day ${rule.date})`;
  if (rule.type === 'every_x_days') return `Every ${rule.interval} days`;
  if (rule.type === 'every_x_months') return `Every ${rule.interval} months`;
  return 'Custom';
};

const getUpcomingGroup = (dateStr) => {
  if (!dateStr) return 'No Date';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff <= 3) return 'Next 3 Days';
  if (diff <= 7) return 'Next Week';
  return 'Later';
};

const getAvatarInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

const TABLE_HEAD = (
  <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
    <tr>
      <th className="w-8 px-3 py-3"></th>
      <th className="px-2 py-3 text-left">Subject</th>
      <th className="px-2 py-3 text-left">Tags</th>
      <th className="px-2 py-3 text-left">Assignee</th>
      <th className="px-2 py-3 text-left">Status</th>
      <th className="px-2 py-3 text-left">Priority</th>
      <th className="px-2 py-3 text-right pr-4">Due Date</th>
    </tr>
  </thead>
);

const EmptyState = ({ icon, label, cols = 7 }) => (
  <tr>
    <td colSpan={cols} className="px-6 py-16 text-center">
      <span className="material-symbols-outlined text-4xl text-outline mb-2 block">{icon}</span>
      <p className="text-on-surface-variant font-bold text-sm">{label}</p>
    </td>
  </tr>
);

function EditItemModal({ item, profiles, containers, onClose, onSave }) {
  const safeProfiles = profiles || [];
  const safeContainers = containers || [];
  const [title, setTitle] = useState(item.title || '');
  const [desc, setDesc] = useState(item.description || '');
  const [assigneeId, setAssigneeId] = useState(item.assignee_id || '');
  const [priority, setPriority] = useState(item.priority || 'Medium');
  const [dueDate, setDueDate] = useState(item.expected_date || '');
  const [status, setStatus] = useState(item.status || 'Assigned');
  const [estMins, setEstMins] = useState(item.estimated_hours != null ? String(item.estimated_hours) : '');
  const [loading, setLoading] = useState(false);

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(item.id, {
      title,
      description: desc || null,
      assignee_id: assigneeId || null,
      priority,
      expected_date: dueDate || null,
      status,
      ...(estMins !== '' ? { estimated_hours: Number(estMins) } : {}),
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <h2 className="font-bold text-base font-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">edit</span> Edit Item
          </h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Title *</label>
            <input required className={cls} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Description</label>
            <textarea className={cls + " resize-none"} rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assignee</label>
              <select className={cls} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">— Unassigned —</option>
                {safeProfiles.filter(p => p.role !== 'Admin').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</label>
              <select className={cls} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Assigned">Assigned</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority</label>
              <select className={cls} value={priority} onChange={e => setPriority(e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Due Date</label>
              <input type="date" className={cls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Est. Time (min)</label>
            <input type="number" min="0" placeholder="e.g. 90" className={cls} value={estMins} onChange={e => setEstMins(e.target.value)} />
          </div>
        </form>
        <div className="flex gap-3 px-6 pb-5 border-t border-surface-container pt-4">
          <button type="button" className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">save</span>{loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AllTasksPage() {
  const {
    workItems, profiles, currentUser, containers,
    startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, staffGroup,
  } = useDataContext();

  const [activeTab, setActiveTab] = useState('Active');
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  const getAssigneeName = (id) => safeProfiles.find(p => p.id === id)?.name ?? 'Unassigned';
  const getContainer = (id) => safeContainers.find(c => c.id === id);
  const getParentTask = (id) => safeWorkItems.find(w => w.id === id);

  // Base: exclude planning pool, apply role/group filter
  let baseRaw = safeWorkItems.filter(w => !w.in_planning_pool);
  if (currentUser.role === 'Assignee') {
    baseRaw = baseRaw.filter(w => w.assignee_id === currentUser.id);
  } else {
    baseRaw = baseRaw.filter(w => {
      const assignee = safeProfiles.find(p => p.id === w.assignee_id);
      return !assignee || assignee.staff_group === staffGroup;
    });
  }

  const actionableBase = getActionableUnits(baseRaw);
  const nonRecurring = actionableBase.filter(w => !w.is_recurring);
  const recurringTemplates = safeWorkItems.filter(w => w.is_recurring);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const activeItems = nonRecurring.filter(w => w.status !== 'Completed');
  const upcomingItems = nonRecurring.filter(w => {
    if (w.status !== 'Assigned' || isOverdue(w)) return false;
    if (!w.expected_date) return true;
    const due = new Date(w.expected_date); due.setHours(0, 0, 0, 0);
    return due > today;
  });
  const historyItems = nonRecurring.filter(w => w.status === 'Completed');

  const applyFilters = (items) => {
    let r = items;
    if (searchQuery) r = r.filter(w => w.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterPriority) r = r.filter(w => getPriorityLabel(w.priority) === filterPriority);
    return r;
  };

  const displayActive = applyFilters(activeItems);
  const displayUpcoming = applyFilters(upcomingItems);
  const displayHistory = applyFilters(historyItems);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  // Shared expanded detail row
  const renderExpandedRow = (item) => {
    const siblings = item.parent_id
      ? actionableBase.filter(w => w.parent_id === item.parent_id && w.id !== item.id)
      : actionableBase.filter(w => w.parent_id === item.id);

    return (
      <tr>
        <td colSpan={7} className="bg-surface-container-low/30 border-b border-surface-container-high">
          <div className="px-6 py-4 flex flex-col gap-3">
            {item.description && (
              <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
            )}
            {!item.description && (
              <p className="text-sm text-on-surface-variant italic">No description.</p>
            )}

            {siblings.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  {item.parent_id ? 'Other items in this group' : 'Sub-items'}
                </p>
                <div className="flex flex-col gap-1">
                  {siblings.map(s => {
                    const sds = getDisplayStatus(s);
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-outline-variant/20 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sds === 'Completed' ? 'bg-green-500' : sds === 'Overdue' ? 'bg-red-500' : 'bg-primary'}`}></span>
                        <span className="flex-1 truncate text-on-surface font-medium">{s.title}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${getStatusBadgeClass(sds)}`}>{sds}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {item.status === 'Assigned' && (
                <button
                  onClick={(e) => { e.stopPropagation(); startWorkItem(item.id); }}
                  className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span> Start
                </button>
              )}
              {item.status === 'Ongoing' && (
                <button
                  onClick={(e) => { e.stopPropagation(); completeWorkItem(item.id); }}
                  className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> Complete
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setEditingItem(item); }}
                className="flex items-center gap-1.5 bg-white border border-outline-variant/40 text-on-surface-variant text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span> Edit
              </button>
              {currentUser.role === 'Admin' && (
                <button
                  onClick={e => { e.stopPropagation(); if (window.confirm('Delete this item?')) deleteWorkItem(item.id); }}
                  className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span> Delete
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Standard work item row
  const renderWorkRow = (item) => {
    const isExpanded = expandedId === item.id;
    const ds = getDisplayStatus(item);
    const container = item.container_id ? getContainer(item.container_id) : null;
    const parentTask = item.parent_id ? getParentTask(item.parent_id) : null;
    const assigneeName = getAssigneeName(item.assignee_id);

    return (
      <React.Fragment key={item.id}>
        <tr
          className={`transition-colors cursor-pointer ${
            isExpanded ? 'bg-surface-container-low/60' :
            ds === 'Overdue' ? 'bg-red-50/60 hover:bg-red-50' :
            ds === 'Not Started' ? 'bg-amber-50/40 hover:bg-amber-50/70' :
            'hover:bg-surface-container-low/40'
          }`}
          onClick={() => toggleExpand(item.id)}
        >
          <td className="w-8 px-3 py-3">
            <span className={`material-symbols-outlined text-[18px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          </td>
          <td className="px-2 py-3 max-w-[220px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.title}</span>
              {parentTask && (
                <span className="text-[10px] text-on-surface-variant/70">↳ {parentTask.title}</span>
              )}
            </div>
          </td>
          <td className="px-2 py-3">
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                {item.type}
              </span>
              {container && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {container.type}: {(container.title ?? container.name ?? '').substring(0, 14)}
                </span>
              )}
            </div>
          </td>
          <td className="px-2 py-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold text-on-surface flex-shrink-0">
                {getAvatarInitials(assigneeName)}
              </div>
              <span className="text-xs text-on-surface-variant truncate max-w-[72px]">{assigneeName.split(' ')[0]}</span>
            </div>
          </td>
          <td className="px-2 py-3">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${getStatusBadgeClass(ds)}`}>{ds}</span>
          </td>
          <td className="px-2 py-3">
            {item.priority != null && (
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getPriorityColor(item.priority)}`}>
                {getPriorityLabel(item.priority)}
              </span>
            )}
          </td>
          <td className="px-2 py-3 text-xs text-on-surface-variant font-medium text-right pr-4">
            {item.expected_date ?? '—'}
          </td>
        </tr>
        {isExpanded && renderExpandedRow(item)}
      </React.Fragment>
    );
  };

  const UPCOMING_GROUPS = ['Tomorrow', 'Next 3 Days', 'Next Week', 'Later', 'No Date'];

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Work Pipeline</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Tasks · Subtasks · Milestones · Checklists</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <FilterBar showToggle={currentUser.role === 'Admin'} showDateFilter={false} />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-outline-variant/40 rounded-xl pl-9 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
            />
          </div>
          {/* Priority */}
          <div className="relative">
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="appearance-none bg-white border border-outline-variant/40 rounded-xl px-4 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">arrow_drop_down</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-surface-container-high overflow-x-auto no-scrollbar">
        {[
          { key: 'Active', count: activeItems.length },
          { key: 'Upcoming', count: upcomingItems.length },
          { key: 'Recurring', count: recurringTemplates.length },
          { key: 'History', count: null },
        ].map(({ key, count }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setExpandedId(null); }}
            className={`pb-3 text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap ${activeTab === key ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {activeTab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
            {key}
            {count != null && count > 0 && (
              <span className="ml-2 bg-primary-container text-on-primary-container text-[10px] px-1.5 py-0.5 rounded-full font-black">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ACTIVE ── */}
      {activeTab === 'Active' && (
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              {TABLE_HEAD}
              <tbody className="divide-y divide-surface-container-low">
                {displayActive.length === 0
                  ? <EmptyState icon="inventory_2" label="No active work items." />
                  : displayActive.map(renderWorkRow)
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── UPCOMING ── */}
      {activeTab === 'Upcoming' && (
        <div className="flex flex-col gap-4">
          {displayUpcoming.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2 block">upcoming</span>
              <p className="text-on-surface-variant font-bold text-sm">No upcoming work scheduled.</p>
            </div>
          )}
          {UPCOMING_GROUPS.map(group => {
            const groupItems = displayUpcoming.filter(w => getUpcomingGroup(w.expected_date) === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group} className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                <div className="px-5 py-3 bg-surface-container-lowest border-b border-surface-container-high flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">event</span>
                  <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">{group}</h3>
                  <span className="ml-1 text-[10px] font-bold bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">{groupItems.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    {TABLE_HEAD}
                    <tbody className="divide-y divide-surface-container-low">
                      {groupItems.map(renderWorkRow)}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RECURRING ── */}
      {activeTab === 'Recurring' && (
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                  <th className="px-6 py-3 text-left">Task</th>
                  <th className="px-6 py-3 text-left">Recurrence</th>
                  <th className="px-6 py-3 text-left">Last Generated</th>
                  <th className="px-6 py-3 text-left">Assignee</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  {currentUser.role === 'Admin' && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {recurringTemplates.length === 0
                  ? <EmptyState icon="autorenew" label="No recurring tasks configured." cols={6} />
                  : recurringTemplates.map(item => {
                    const assigneeName = getAssigneeName(item.assignee_id);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-on-surface">{item.title}</span>
                            {item.description && (
                              <span className="text-[11px] text-on-surface-variant line-clamp-1">{item.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
                            {getRecurrenceLabel(item.recurrence_rule)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-on-surface-variant">
                          {item.last_generated_at ?? '—'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold text-on-surface flex-shrink-0">
                              {getAvatarInitials(assigneeName)}
                            </div>
                            <span className="text-xs text-on-surface-variant">{assigneeName.split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                            {item.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        {currentUser.role === 'Admin' && (
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => updateWorkItem(item.id, { is_active: !item.is_active })}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-white hover:bg-surface-container text-on-surface-variant transition-colors"
                            >
                              {item.is_active ? 'Pause' : 'Resume'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'History' && (
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                  <th className="px-6 py-3 text-left">Subject</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Parent</th>
                  <th className="px-6 py-3 text-left">Assignee</th>
                  <th className="px-6 py-3 text-center">Delivery</th>
                  <th className="px-6 py-3 text-right">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {displayHistory.length === 0
                  ? <EmptyState icon="history" label="No completed items yet." cols={6} />
                  : displayHistory.map(item => {
                    const container = item.container_id ? getContainer(item.container_id) : null;
                    const parentTask = item.parent_id ? getParentTask(item.parent_id) : null;
                    const parentLabel = container
                      ? `${container.type}: ${container.title ?? container.name}`
                      : parentTask ? `Task: ${parentTask.title}` : '—';
                    const wasLate = item.expected_date &&
                      new Date(item.expected_date) < new Date(item.updated_at ?? item.created_at);
                    const assigneeName = getAssigneeName(item.assignee_id);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="px-6 py-3">
                          <span className="text-sm font-semibold text-on-surface">{item.title}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-on-surface-variant truncate max-w-[160px]">{parentLabel}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold text-on-surface flex-shrink-0">
                              {getAvatarInitials(assigneeName)}
                            </div>
                            <span className="text-xs text-on-surface-variant">{assigneeName.split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${wasLate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {wasLate ? 'Late' : 'On Time'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-on-surface-variant font-medium">
                          {item.expected_date ?? '—'}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          profiles={profiles}
          containers={containers}
          onClose={() => setEditingItem(null)}
          onSave={async (id, updates) => { await updateWorkItem(id, updates); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
