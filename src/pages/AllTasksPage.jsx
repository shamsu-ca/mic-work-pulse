import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, getStatusBadgeClass } from '../lib/statusUtils';
import FilterBar from '../components/common/FilterBar';

const PRIORITY_COLOR = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-blue-100 text-blue-700',
  Low:      'bg-surface-container text-on-surface-variant',
};
const getPriorityColor = (p) => PRIORITY_COLOR[p] ?? PRIORITY_COLOR.Low;
const STATUS_ORDER = { Overdue: 0, 'Not Started': 1, Assigned: 2, Ongoing: 3, Completed: 4 };
const sortByStatus = (items) =>
  [...items].sort((a, b) => (STATUS_ORDER[getDisplayStatus(a)] ?? 5) - (STATUS_ORDER[getDisplayStatus(b)] ?? 5));

const todayStr   = () => new Date().toISOString().split('T')[0];
const offsetDate = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
const getAvatarInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getResolutionStatus = (item) => {
  if (!item.expected_date) return { label: 'On Time', cls: 'bg-green-100 text-green-700' };
  const due = new Date(item.expected_date + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((now - due) / 86400000);
  return diff > 0
    ? { label: `Delayed ${diff}d`, cls: 'bg-orange-100 text-orange-700' }
    : { label: 'On Time', cls: 'bg-green-100 text-green-700' };
};

function DeleteBtn({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) return (
    <span className="flex items-center gap-1">
      <button onClick={onConfirm} className="text-[11px] font-bold bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700">Confirm</button>
      <button onClick={() => setConfirming(false)} className="text-[11px] font-bold border border-outline-variant/40 text-on-surface-variant px-2 py-1 rounded-lg hover:bg-surface-container">Cancel</button>
    </span>
  );
  return (
    <button onClick={() => setConfirming(true)} className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50">
      <span className="material-symbols-outlined text-[14px]">delete</span> Delete
    </button>
  );
}

function ExpandedContent({ item, profiles, containers, workItems, currentUser, onEdit, onStart, onComplete, onDelete, showActions = true }) {
  const container  = (containers || []).find(c => c.id === item.container_id) ?? null;
  const parentItem = (workItems  || []).find(w => w.id === item.parent_id)   ?? null;
  const parentTask = parentItem && !['Phase', 'Project', 'Event'].includes(parentItem.type) ? parentItem : null;
  const phaseItem  = parentItem?.type === 'Phase' ? parentItem : null;
  const assigneeName = (profiles || []).find(p => p.id === item.assignee_id)?.name ?? 'Unassigned';
  const ds = getDisplayStatus(item);
  const isAssignee = currentUser?.role === 'Assignee';
  const subItems = (workItems || []).filter(w => w.parent_id === item.id && (!isAssignee || w.assignee_id === currentUser.id));

  return (
    <div className="px-5 py-4 flex flex-col gap-3">
      {(container || parentTask || phaseItem) && (
        <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border border-outline-variant/20 px-3 py-2.5">
          {container && (
            <span className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[17px] ${container.type === 'Project' ? 'text-indigo-500' : 'text-emerald-500'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {container.type === 'Project' ? 'folder_open' : 'event'}
              </span>
              {container.title}
            </span>
          )}
          {phaseItem && <span className="text-xs text-on-surface-variant">→ {phaseItem.title}</span>}
          {parentTask && (
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              ↳ <strong className="text-on-surface font-semibold ml-0.5">{parentTask.title}</strong>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-[13px]">person</span>{assigneeName}
        </span>
        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getStatusBadgeClass(ds)}`}>{ds}</span>
        {item.priority && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getPriorityColor(item.priority)}`}>{item.priority}</span>}
        {item.expected_date && (
          <span className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">calendar_today</span>{item.expected_date}
          </span>
        )}
      </div>

      {item.description && <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>}

      {subItems.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-outline-variant/20">
          {subItems.map(s => {
            const sds = getDisplayStatus(s);
            const sName = (profiles || []).find(p => p.id === s.assignee_id)?.name ?? 'Unassigned';
            return (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span className="text-on-surface-variant flex-shrink-0">↳</span>
                <span className="font-medium text-on-surface flex-1 leading-snug">{s.title}</span>
                <span className="text-on-surface-variant/70 hidden sm:block flex-shrink-0">{sName.split(' ')[0]}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(sds)}`}>{sds}</span>
              </div>
            );
          })}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 flex-wrap pt-1">
          {item.status === 'Assigned' && (
            <button onClick={() => onStart(item.id)} className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">
              <span className="material-symbols-outlined text-[14px]">play_arrow</span> Start
            </button>
          )}
          {item.status === 'Ongoing' && (
            <button onClick={() => onComplete(item.id)} className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> Complete
            </button>
          )}
          <button onClick={onEdit} className="flex items-center gap-1.5 bg-white border border-outline-variant/40 text-on-surface-variant text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-[14px]">edit</span> Edit
          </button>
          {currentUser?.role === 'Admin' && <DeleteBtn onConfirm={() => onDelete(item.id)} />}
        </div>
      )}
    </div>
  );
}

function EditItemModal({ item, profiles, onClose, onSave }) {
  const [title, setTitle]           = useState(item.title || '');
  const [desc, setDesc]             = useState(item.description || '');
  const [assigneeId, setAssigneeId] = useState(item.assignee_id || '');
  const [priority, setPriority]     = useState(item.priority || 'Medium');
  const [dueDate, setDueDate]       = useState(item.expected_date || '');
  const [status, setStatus]         = useState(item.status || 'Assigned');
  const [loading, setLoading]       = useState(false);

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";

  const handleSave = async (e) => {
    e?.preventDefault();
    setLoading(true);
    await onSave(item.id, { title, description: desc || null, assignee_id: assigneeId || null, priority, expected_date: dueDate || null, status });
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
                {(profiles || []).filter(p => p.role !== 'Admin').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</label>
              <select className={cls} value={status} onChange={e => setStatus(e.target.value)}>
                <option>Assigned</option><option>Ongoing</option><option>Completed</option>
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
        </form>
        <div className="flex gap-3 px-6 pb-5 border-t border-surface-container pt-4">
          <button type="button" className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">save</span>{loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, count, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-0">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-1 py-2 text-left group">
        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 text-on-surface-variant ${open ? 'rotate-90' : ''}`}>chevron_right</span>
        {icon && <span className="material-symbols-outlined text-[15px] text-on-surface-variant">{icon}</span>}
        <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">{title}</span>
        {count != null && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${badge ?? 'bg-surface-container text-on-surface-variant'}`}>{count}</span>
        )}
        <span className="ml-auto text-[10px] text-on-surface-variant/50 group-hover:text-on-surface-variant">
          {open ? 'collapse' : 'expand'}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Upcoming tab table ───────────────────────────────────────────────────────
function WorkTable({ items, profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, emptyLabel }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const safeProfiles   = profiles   || [];
  const safeContainers = containers || [];
  const safeWorkItems  = workItems  || [];
  const showAssignee   = currentUser?.role !== 'Assignee';
  const colCount       = showAssignee ? 5 : 4;

  const getAssigneeName = (id) => safeProfiles.find(p => p.id === id)?.name ?? 'Unassigned';
  const getContainer    = (id) => safeContainers.find(c => c.id === id);
  const getItem         = (id) => safeWorkItems.find(w => w.id === id);

  const renderRow = (item) => {
    const isExpanded   = expandedId === item.id;
    const ds           = getDisplayStatus(item);
    const container    = item.container_id ? getContainer(item.container_id) : null;
    const parentTask   = item.parent_id    ? getItem(item.parent_id)         : null;
    const assigneeName = getAssigneeName(item.assignee_id);

    return (
      <React.Fragment key={item.id}>
        <tr
          className={`transition-colors cursor-pointer ${
            isExpanded           ? 'bg-surface-container-low/60' :
            ds === 'Overdue'     ? 'bg-red-50/60 hover:bg-red-50' :
            ds === 'Not Started' ? 'bg-amber-50/40 hover:bg-amber-50/70' :
            'hover:bg-surface-container-low/40'
          }`}
          onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}
        >
          <td className="w-8 px-3 py-3">
            <span className={`material-symbols-outlined text-[18px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
          </td>
          <td className="px-2 py-3 max-w-[260px]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.title}</span>
                {container && (
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${
                    container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>{container.type}</span>
                )}
              </div>
              {parentTask && parentTask.type !== 'Phase' && (
                <span className="text-[10px] text-on-surface-variant/70">↳ {parentTask.title}</span>
              )}
              {parentTask?.type === 'Phase' && (
                <span className="text-[10px] text-on-surface-variant/70 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">layers</span> {parentTask.title}
                </span>
              )}
            </div>
          </td>
          {showAssignee && (
            <td className="px-2 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold text-on-surface flex-shrink-0">
                  {getAvatarInitials(assigneeName)}
                </div>
                <span className="text-xs text-on-surface-variant truncate max-w-[80px]">{assigneeName.split(' ')[0]}</span>
              </div>
            </td>
          )}
          <td className="px-2 py-3">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${getStatusBadgeClass(ds)}`}>{ds}</span>
          </td>
          <td className="px-2 py-3 text-xs text-on-surface-variant font-medium text-right pr-4">
            {item.expected_date ?? '—'}
          </td>
        </tr>
        {isExpanded && (
          <tr key={`exp-${item.id}`}>
            <td colSpan={colCount} className="bg-surface-container-low/30 border-b border-surface-container-high">
              <ExpandedContent
                item={item} profiles={safeProfiles} containers={safeContainers} workItems={safeWorkItems}
                currentUser={currentUser} onEdit={() => setEditingItem(item)}
                onStart={startWorkItem} onComplete={completeWorkItem} onDelete={deleteWorkItem} showActions />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
              <tr>
                <th className="w-8 px-3 py-3" />
                <th className="px-2 py-3 text-left">Subject</th>
                {showAssignee && <th className="px-2 py-3 text-left">Assignee</th>}
                <th className="px-2 py-3 text-left">Status</th>
                <th className="px-2 py-3 text-right pr-4">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {items.length === 0
                ? <tr><td colSpan={colCount} className="px-6 py-10 text-center text-on-surface-variant font-bold text-sm">{emptyLabel ?? 'No items.'}</td></tr>
                : items.map(renderRow)
              }
            </tbody>
          </table>
        </div>
      </div>
      {editingItem && (
        <EditItemModal item={editingItem} profiles={profiles} onClose={() => setEditingItem(null)}
          onSave={async (id, updates) => { await updateWorkItem(id, updates); setEditingItem(null); }} />
      )}
    </>
  );
}

// ─── Active tab: table for one status group ───────────────────────────────────
function ActiveGroupTable({ roots, childrenOf, profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, showAssignee }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const colCount = showAssignee ? 5 : 4;

  const renderRow = (item, isChild = false) => {
    const isExpanded = expandedId === item.id;
    const ds = getDisplayStatus(item);
    const assigneeName = (profiles || []).find(p => p.id === item.assignee_id)?.name ?? 'Unassigned';
    const children = isChild ? [] : childrenOf(item.id);

    return (
      <React.Fragment key={item.id}>
        <tr
          className={`cursor-pointer transition-colors ${isChild ? 'bg-surface-container-lowest/40' : ''} ${isExpanded ? 'bg-surface-container-low/60' : 'hover:bg-surface-container-low/40'}`}
          onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}
        >
          <td className="w-8 px-3 py-3">
            <span className={`material-symbols-outlined text-[18px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
          </td>
          <td className="px-2 py-3 max-w-[260px]">
            <div className={`flex items-center gap-1.5 ${isChild ? 'pl-5' : ''}`}>
              {isChild && <span className="text-on-surface-variant text-xs flex-shrink-0">↳</span>}
              <span className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.title}</span>
              {isChild && (
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(ds)}`}>{ds}</span>
              )}
            </div>
          </td>
          {showAssignee && (
            <td className="px-2 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold text-on-surface flex-shrink-0">
                  {getAvatarInitials(assigneeName)}
                </div>
                <span className="text-xs text-on-surface-variant truncate max-w-[80px]">{assigneeName.split(' ')[0]}</span>
              </div>
            </td>
          )}
          <td className="px-2 py-3">
            {!isChild && <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${getStatusBadgeClass(ds)}`}>{ds}</span>}
          </td>
          <td className="px-2 py-3 text-xs text-on-surface-variant font-medium text-right pr-4">
            {item.expected_date ?? '—'}
          </td>
        </tr>
        {isExpanded && (
          <tr key={`exp-${item.id}`}>
            <td colSpan={colCount} className="bg-surface-container-low/30 border-b border-surface-container-high">
              <ExpandedContent
                item={item} profiles={profiles || []} containers={containers || []} workItems={workItems || []}
                currentUser={currentUser} onEdit={() => setEditingItem(item)}
                onStart={startWorkItem} onComplete={completeWorkItem} onDelete={deleteWorkItem} showActions />
            </td>
          </tr>
        )}
        {!isChild && children.map(child => renderRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
              <tr>
                <th className="w-8 px-3 py-3" />
                <th className="px-2 py-3 text-left">Subject</th>
                {showAssignee && <th className="px-2 py-3 text-left">Assignee</th>}
                <th className="px-2 py-3 text-left">Status</th>
                <th className="px-2 py-3 text-right pr-4">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {roots.map(root => renderRow(root, false))}
            </tbody>
          </table>
        </div>
      </div>
      {editingItem && (
        <EditItemModal item={editingItem} profiles={profiles} onClose={() => setEditingItem(null)}
          onSave={async (id, updates) => { await updateWorkItem(id, updates); setEditingItem(null); }} />
      )}
    </>
  );
}

function StatusGroupedView({ items, profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem }) {
  const showAssignee = currentUser?.role !== 'Assignee';
  const itemIds = new Set(items.map(w => w.id));
  const rootItems = items.filter(w => !w.parent_id || !itemIds.has(w.parent_id));
  const childrenOf = (parentId) => items.filter(w => w.parent_id === parentId);

  const STATUS_GROUPS = [
    { key: 'Overdue',     label: 'Overdue',     icon: 'warning',  badge: 'bg-red-100 text-red-700',      defaultOpen: true },
    { key: 'Not Started', label: 'Not Started', icon: 'pending',  badge: 'bg-amber-100 text-amber-700',  defaultOpen: true },
    { key: 'Assigned',    label: 'Assigned',    icon: 'person',   badge: 'bg-blue-100 text-blue-700',    defaultOpen: true },
    { key: 'Ongoing',     label: 'Ongoing',     icon: 'sync',     badge: 'bg-purple-100 text-purple-700',defaultOpen: true },
  ];

  const tableProps = { profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, showAssignee, childrenOf };

  return (
    <div className="flex flex-col gap-4">
      {rootItems.length === 0 && (
        <div className="bg-white rounded-xl border border-outline-variant/30 py-16 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block text-outline">check_circle</span>
          <p className="font-bold">All clear for today!</p>
        </div>
      )}
      {STATUS_GROUPS.map(group => {
        const groupRoots = rootItems.filter(w => getDisplayStatus(w) === group.key);
        if (groupRoots.length === 0) return null;
        return (
          <Section key={group.key} icon={group.icon} title={group.label} count={groupRoots.length} badge={group.badge} defaultOpen={group.defaultOpen}>
            <ActiveGroupTable roots={groupRoots} {...tableProps} />
          </Section>
        );
      })}
    </div>
  );
}

// ─── History table ─────────────────────────────────────────────────────────────
function HistoryTable({ items, profiles, containers, workItems, currentUser }) {
  const [expandedId, setExpandedId] = useState(null);
  const showAssignee = currentUser?.role !== 'Assignee';
  const colCount = showAssignee ? 4 : 3;

  const renderRow = (item) => {
    const isExpanded = expandedId === item.id;
    const assigneeName = (profiles || []).find(p => p.id === item.assignee_id)?.name ?? 'Unassigned';
    const resolution = getResolutionStatus(item);

    return (
      <React.Fragment key={item.id}>
        <tr className="cursor-pointer hover:bg-surface-container-low/40 transition-colors"
          onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}>
          <td className="w-8 px-3 py-3">
            <span className={`material-symbols-outlined text-[18px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
          </td>
          <td className="px-2 py-3 max-w-[260px]">
            <span className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.title}</span>
          </td>
          {showAssignee && (
            <td className="px-2 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold text-on-surface flex-shrink-0">
                  {getAvatarInitials(assigneeName)}
                </div>
                <span className="text-xs text-on-surface-variant">{assigneeName.split(' ')[0]}</span>
              </div>
            </td>
          )}
          <td className="px-2 py-3 text-right pr-4">
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${resolution.cls}`}>{resolution.label}</span>
          </td>
        </tr>
        {isExpanded && (
          <tr key={`exp-${item.id}`}>
            <td colSpan={colCount} className="bg-surface-container-low/30 border-b border-surface-container-high">
              <ExpandedContent
                item={item} profiles={profiles || []} containers={containers || []} workItems={workItems || []}
                currentUser={currentUser} onEdit={() => {}} onStart={() => {}} onComplete={() => {}} onDelete={() => {}}
                showActions={false} />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-2 py-3 text-left">Subject</th>
              {showAssignee && <th className="px-2 py-3 text-left">Assignee</th>}
              <th className="px-2 py-3 text-right pr-4">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {items.length === 0
              ? <tr><td colSpan={colCount} className="px-6 py-10 text-center text-on-surface-variant font-bold text-sm">No completed items yet.</td></tr>
              : items.map(renderRow)
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AllTasksPage() {
  const {
    workItems, profiles, currentUser, containers,
    startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem,
  } = useDataContext();

  const [activeTab, setActiveTab]           = useState('Active');
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStaff, setFilterStaff]       = useState('');
  const [filterDept, setFilterDept]         = useState('');

  const safeWorkItems  = workItems  || [];
  const safeProfiles   = profiles   || [];
  const safeContainers = containers || [];

  let baseRaw = safeWorkItems.filter(w => !w.in_planning_pool && !w.is_recurring);
  if (currentUser?.role === 'Assignee') {
    baseRaw = baseRaw.filter(w => w.assignee_id === currentUser.id);
  } else {
    // Admin sees all
  }

  const allBase = baseRaw.filter(w => {
    const type = w.type?.toLowerCase();
    return type !== 'project' && type !== 'event' && type !== 'phase';
  });

  const deptList = ['All Departments', ...new Set(safeProfiles.filter(p => p.role !== 'Admin').map(p => p.department).filter(Boolean))];
  const staffListForFilter = safeProfiles.filter(p => p.role !== 'Admin' && (!filterDept || filterDept === 'All Departments' || p.department === filterDept));

  const applyFilters = (items) => {
    let r = items;
    if (searchQuery)    r = r.filter(w => w.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterPriority) r = r.filter(w => w.priority === filterPriority);
    if (filterStaff)    r = r.filter(w => w.assignee_id === filterStaff);
    else if (filterDept && filterDept !== 'All Departments') {
      const ids = new Set(safeProfiles.filter(p => p.department === filterDept).map(p => p.id));
      r = r.filter(w => ids.has(w.assignee_id));
    }
    return r;
  };

  const today    = todayStr();
  const tomorrow = offsetDate(1);

  const todayItems = applyFilters(allBase.filter(w => {
    if (w.status === 'Completed') return false;
    if (w.status === 'Ongoing')   return true;
    if (!w.expected_date)         return false;
    return w.expected_date <= today;
  }));

  const tomorrowItems = sortByStatus(applyFilters(allBase.filter(w => {
    if (w.status === 'Completed') return false;
    if (w.status === 'Ongoing')   return false;
    return w.expected_date === tomorrow;
  })));

  const mkUpcoming = (minOffset, maxOffset) => sortByStatus(applyFilters(allBase.filter(w => {
    if (w.status === 'Completed') return false;
    if (w.status === 'Ongoing')   return false;
    if (!w.expected_date)         return minOffset > 100;
    const diff = Math.round((new Date(w.expected_date) - new Date(today)) / 86400000);
    return diff >= minOffset && diff <= maxOffset;
  })));

  const laterItems = sortByStatus(applyFilters(allBase.filter(w => {
    if (w.status === 'Completed') return false;
    if (w.status === 'Ongoing')   return false;
    if (!w.expected_date)         return w.status === 'Assigned';
    const diff = Math.round((new Date(w.expected_date) - new Date(today)) / 86400000);
    return diff > 7;
  })));

  const next3Days = mkUpcoming(2, 4);
  const thisWeek  = mkUpcoming(5, 7);
  const historyItems = sortByStatus(applyFilters(allBase.filter(w => w.status === 'Completed')));

  const upcomingCount = tomorrowItems.length + next3Days.length + thisWeek.length + laterItems.length;

  const sharedProps = { profiles: safeProfiles, containers: safeContainers, workItems: safeWorkItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem };

  const TAB_CFG = [
    { key: 'Active',   label: 'Today',    count: todayItems.length,   badge: todayItems.some(w => getDisplayStatus(w) === 'Overdue') ? 'bg-red-100 text-red-700' : 'bg-primary-container text-on-primary-container' },
    { key: 'Upcoming', label: 'Upcoming', count: upcomingCount,       badge: 'bg-blue-100 text-blue-700' },
    { key: 'History',  label: 'History',  count: historyItems.length, badge: 'bg-green-100 text-green-700' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto pb-12 animate-fade-in">

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Works</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Daily work tracker — sorted by urgency & deadline</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-surface-container rounded-xl p-1 gap-0.5">
            {TAB_CFG.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                }`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? tab.badge : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[15px]">search</span>
              <input type="text" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="bg-white border border-outline-variant/40 rounded-full pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-32 md:w-44 transition-all" />
            </div>
            <div className="relative hidden sm:block">
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                className="appearance-none bg-white border border-outline-variant/40 rounded-full px-3 py-1.5 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="">Priority</option>
                <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
              </select>
              <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[15px]">arrow_drop_down</span>
            </div>
          </div>
        </div>
        {currentUser?.role === 'Admin' && (
          <div className="flex items-center gap-2 flex-wrap">
            <FilterBar showDateFilter={false} />
            <div className="relative">
              <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterStaff(''); }}
                className="appearance-none bg-white border border-outline-variant/40 rounded-full px-3 py-1.5 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                {deptList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[15px]">arrow_drop_down</span>
            </div>
            <div className="relative">
              <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
                className="appearance-none bg-white border border-outline-variant/40 rounded-full px-3 py-1.5 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="">All Staff</option>
                {staffListForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[15px]">arrow_drop_down</span>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'Active' && (
        <StatusGroupedView items={todayItems} {...sharedProps} />
      )}

      {activeTab === 'Upcoming' && (
        <div className="flex flex-col gap-5">
          <Section icon="event_upcoming" title="Tomorrow" count={tomorrowItems.length} badge="bg-blue-100 text-blue-700" defaultOpen>
            <WorkTable items={tomorrowItems} {...sharedProps} emptyLabel="Nothing due tomorrow." />
          </Section>
          {next3Days.length > 0 && (
            <Section icon="looks_3" title="Next 3 Days" count={next3Days.length} badge="bg-indigo-100 text-indigo-700" defaultOpen>
              <WorkTable items={next3Days} {...sharedProps} emptyLabel="Nothing in the next 3 days." />
            </Section>
          )}
          {thisWeek.length > 0 && (
            <Section icon="view_week" title="This Week" count={thisWeek.length} badge="bg-primary-container text-on-primary-container" defaultOpen>
              <WorkTable items={thisWeek} {...sharedProps} emptyLabel="Nothing else this week." />
            </Section>
          )}
          {laterItems.length > 0 && (
            <Section icon="schedule" title="Later" count={laterItems.length} badge="bg-surface-container text-on-surface-variant" defaultOpen={false}>
              <WorkTable items={laterItems} {...sharedProps} emptyLabel="Nothing scheduled later." />
            </Section>
          )}
          {upcomingCount === 0 && (
            <div className="bg-white rounded-xl border border-outline-variant/30 py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block text-outline">date_range</span>
              <p className="font-bold">No upcoming work scheduled.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'History' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[15px] text-on-surface-variant">history</span>
            <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Completed</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{historyItems.length}</span>
          </div>
          <HistoryTable items={historyItems} {...sharedProps} />
        </div>
      )}

    </div>
  );
}
