import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, getStatusBadgeClass } from '../lib/statusUtils';
import { fmtDate } from '../lib/dateUtils';
import FilterBar from '../components/common/FilterBar';
import CompletionPanel from '../components/common/CompletionPanel';
import FollowUpModal from '../components/common/FollowUpModal';

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

const todayStr      = () => new Date().toISOString().split('T')[0];
const offsetDate    = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
const weekMondayStr = () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d.toISOString().split('T')[0]; };
const getCompletedDate = (item) => item.completed_at ? item.completed_at.split('T')[0] : '';
const getAvatarInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getResolutionStatus = (item) => {
  if (!item.expected_date) return { label: 'Completed On Time', cls: 'bg-green-100 text-green-700' };
  const due = new Date(item.expected_date + 'T00:00:00');
  const completedOn = new Date(item.completed_at ?? new Date());
  completedOn.setHours(0, 0, 0, 0);
  const diff = Math.round((completedOn - due) / 86400000);
  if (diff < 0)  return { label: `Completed Early (${-diff}d)`, cls: 'bg-blue-100 text-blue-700' };
  if (diff === 0) return { label: 'Completed On Time', cls: 'bg-green-100 text-green-700' };
  return { label: `Completed Late (${diff}d)`, cls: 'bg-orange-100 text-orange-700' };
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

function ExpandedContent({ item, profiles, containers, workItems, currentUser, onEdit, onStart, onComplete, onDelete, onAddSubtask, onFollowUp, showActions = true }) {
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [stTitle, setStTitle]   = useState('');
  const [stDate, setStDate]     = useState('');
  const [stAssignee, setStAssignee] = useState('');
  const [stSaving, setStSaving] = useState(false);

  const container  = (containers || []).find(c => c.id === item.container_id) ?? null;
  const parentItem = (workItems  || []).find(w => w.id === item.parent_id)   ?? null;
  const parentTask = parentItem && !['Phase', 'Project', 'Event'].includes(parentItem.type) ? parentItem : null;
  const phaseItem  = parentItem?.type === 'Phase' ? parentItem : null;
  const assigneeName = (profiles || []).find(p => p.id === item.assignee_id)?.name ?? 'Unassigned';
  const ds = getDisplayStatus(item);
  const isAssignee = currentUser?.role === 'Assignee';
  const subItems = (workItems || []).filter(w => w.parent_id === item.id && (!isAssignee || w.assignee_id === currentUser.id));

  const handleAddSub = async (e) => {
    e.preventDefault();
    if (!stTitle.trim() || !onAddSubtask) return;
    setStSaving(true);
    await onAddSubtask(item, { title: stTitle.trim(), date: stDate, assigneeId: stAssignee });
    setStTitle(''); setStDate(''); setStAssignee(''); setStSaving(false); setAddingSubtask(false);
  };

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
            <span className="material-symbols-outlined text-[13px]">calendar_today</span>{fmtDate(item.expected_date)}
          </span>
        )}
      </div>

      {item.description && <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>}

      {(item.completion_note || item.completion_tag) && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-green-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">summarize</span>Completion Report
          </span>
          {item.completion_tag && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-800 self-start">{item.completion_tag}</span>
          )}
          {item.completion_note && (
            <p className="text-sm text-green-900 leading-relaxed">{item.completion_note}</p>
          )}
        </div>
      )}

      {(() => {
        const followUps = (workItems || []).filter(w => w.linked_to === item.id);
        if (!followUps.length && !onFollowUp) return null;
        return (
          <div className="flex flex-col gap-1.5">
            {followUps.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Follow-ups</span>
                {followUps.map(fu => (
                  <div key={fu.id} className="flex items-center gap-2 text-xs pl-2 border-l-2 border-indigo-200">
                    <span className="font-medium text-on-surface flex-1">{fu.title}</span>
                    <span className="text-on-surface-variant/70">{fu.expected_date ? fmtDate(fu.expected_date) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
            {onFollowUp && currentUser?.role === 'Admin' && item.status === 'Completed' && (
              <button onClick={() => onFollowUp(item)} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline self-start">
                <span className="material-symbols-outlined text-[13px]">add_circle</span> Follow-up
              </button>
            )}
          </div>
        );
      })()}

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
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2 flex-wrap">
            {item.status === 'Assigned' && (
              <button onClick={() => onStart(item.id)} className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">
                <span className="material-symbols-outlined text-[14px]">play_arrow</span> Start
              </button>
            )}
            {item.status === 'Ongoing' && (
              <button onClick={() => onComplete(item.id)} className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> Complete &amp; Report
              </button>
            )}
            {currentUser?.role === 'Admin' && (
              <button onClick={onEdit} className="flex items-center gap-1.5 bg-white border border-outline-variant/40 text-on-surface-variant text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined text-[14px]">edit</span> Edit
              </button>
            )}
            {currentUser?.role === 'Admin' && <DeleteBtn onConfirm={() => onDelete(item.id)} />}
          </div>
          {item.type === 'Task' && item.status !== 'Completed' && onAddSubtask && (
            <div className="border-t border-surface-container-high pt-2">
              {!addingSubtask ? (
                <button onClick={() => setAddingSubtask(true)} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                  <span className="material-symbols-outlined text-[13px]">add_circle</span> Add Subtask
                </button>
              ) : (
                <form onSubmit={handleAddSub} className="flex flex-col gap-2">
                  <input
                    autoFocus required
                    className="border border-outline-variant/50 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                    placeholder="Subtask title…"
                    value={stTitle} onChange={e => setStTitle(e.target.value)}
                  />
                  <div className="flex gap-2">
                    {!isAssignee && (
                      <select className="flex-1 border border-outline-variant/50 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={stAssignee} onChange={e => setStAssignee(e.target.value)}>
                        <option value="">Same assignee</option>
                        {(profiles || []).filter(p => p.role !== 'Admin').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    <input type="date" className="flex-1 border border-outline-variant/50 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={stDate} onChange={e => setStDate(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={stSaving || !stTitle.trim()} className="flex-1 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                      {stSaving ? '…' : 'Add Subtask'}
                    </button>
                    <button type="button" onClick={() => { setAddingSubtask(false); setStTitle(''); setStDate(''); setStAssignee(''); }} className="flex-1 py-1.5 text-xs font-bold border border-outline-variant/40 text-on-surface-variant rounded-lg hover:bg-surface-container">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditItemModal({ item, profiles, workItems, onClose, onSave }) {
  const [title, setTitle]           = useState(item.title || '');
  const [desc, setDesc]             = useState(item.description || '');
  const [assigneeId, setAssigneeId] = useState(item.assignee_id || '');
  const [priority, setPriority]     = useState(item.priority || 'Medium');
  const [dueDate, setDueDate]       = useState(item.expected_date || '');
  const [status, setStatus]         = useState(item.status || 'Assigned');
  const [parentId, setParentId]     = useState(item.parent_id || '');
  const [loading, setLoading]       = useState(false);

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";

  const potentialParents = (workItems || []).filter(w =>
    w.id !== item.id && w.type === 'Task' && !w.parent_id
  );

  const handleSave = async (e) => {
    e?.preventDefault();
    setLoading(true);
    await onSave(item.id, { title, description: desc || null, assignee_id: assigneeId || null, priority, expected_date: dueDate || null, status, parent_id: parentId || null });
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
          {potentialParents.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Parent Task (make subtask of)</label>
              <select className={cls} value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">— None (standalone task) —</option>
                {potentialParents.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
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
function WorkTable({ items, profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, onAddSubtask, emptyLabel }) {
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
    const assigneeName = getAssigneeName(item.assignee_id);
    const children     = safeWorkItems.filter(w => w.parent_id === item.id);

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.title}</span>
              {container && (
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${
                  container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>{container.type}</span>
              )}
              {children.length > 0 && <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">{children.length} sub</span>}
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
            {item.expected_date ? fmtDate(item.expected_date) : '—'}
          </td>
        </tr>
        {isExpanded && (
          <tr key={`exp-${item.id}`}>
            <td colSpan={colCount} className="bg-surface-container-low/30 border-b border-surface-container-high">
              <ExpandedContent
                item={item} profiles={safeProfiles} containers={safeContainers} workItems={safeWorkItems}
                currentUser={currentUser} onEdit={() => setEditingItem(item)}
                onStart={startWorkItem} onComplete={completeWorkItem} onDelete={deleteWorkItem} onAddSubtask={onAddSubtask} showActions />
            </td>
          </tr>
        )}
        {children.map(child => {
          const cds = getDisplayStatus(child);
          const cName = getAssigneeName(child.assignee_id);
          return (
            <tr key={child.id} className="bg-surface-container-lowest/40 hover:bg-surface-container-low/30 transition-colors">
              <td className="w-8 px-3 py-2" />
              <td className="px-2 py-2 max-w-[260px]">
                <div className="flex items-center gap-1.5 pl-5">
                  <span className="text-on-surface-variant text-xs flex-shrink-0">↳</span>
                  <span className={`text-xs font-medium leading-tight line-clamp-1 ${cds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{child.title}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(cds)}`}>{cds}</span>
                </div>
              </td>
              {showAssignee && (
                <td className="px-2 py-2">
                  <span className="text-[10px] text-on-surface-variant">{cName.split(' ')[0]}</span>
                </td>
              )}
              <td className="px-2 py-2" />
              <td className="px-2 py-2 text-[10px] text-on-surface-variant text-right pr-4">{child.expected_date ? fmtDate(child.expected_date) : '—'}</td>
            </tr>
          );
        })}
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
        <EditItemModal item={editingItem} profiles={profiles} workItems={safeWorkItems} onClose={() => setEditingItem(null)}
          onSave={async (id, updates) => { await updateWorkItem(id, updates); setEditingItem(null); }} />
      )}
    </>
  );
}

// ─── Active tab: table for one status group ───────────────────────────────────
function ActiveGroupTable({ roots, childrenOf, profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, onAddSubtask, showAssignee }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const colCount = showAssignee ? 4 : 3;

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
              <span className={`text-sm font-semibold leading-tight line-clamp-1 ${isChild && ds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{item.title}</span>
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
          <td className="px-2 py-3 text-xs text-on-surface-variant font-medium text-right pr-4">
            {item.expected_date ? fmtDate(item.expected_date) : '—'}
          </td>
        </tr>
        {isExpanded && (
          <tr key={`exp-${item.id}`}>
            <td colSpan={colCount} className="bg-surface-container-low/30 border-b border-surface-container-high">
              <ExpandedContent
                item={item} profiles={profiles || []} containers={containers || []} workItems={workItems || []}
                currentUser={currentUser} onEdit={() => setEditingItem(item)}
                onStart={startWorkItem} onComplete={completeWorkItem} onDelete={deleteWorkItem} onAddSubtask={onAddSubtask} showActions />
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
        <EditItemModal item={editingItem} profiles={profiles} workItems={safeWorkItems} onClose={() => setEditingItem(null)}
          onSave={async (id, updates) => { await updateWorkItem(id, updates); setEditingItem(null); }} />
      )}
    </>
  );
}

function StatusGroupedView({ items, profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, onAddSubtask }) {
  const showAssignee = currentUser?.role !== 'Assignee';
  const rootItems = items; // allBase already excludes subtasks
  const childrenOf = (parentId) => (workItems || []).filter(w => w.parent_id === parentId && !w.is_recurring);

  const STATUS_GROUPS = [
    { key: 'Overdue',     label: 'Overdue',     icon: 'warning',  badge: 'bg-red-100 text-red-700',      defaultOpen: true },
    { key: 'Not Started', label: 'Not Started', icon: 'pending',  badge: 'bg-amber-100 text-amber-700',  defaultOpen: true },
    { key: 'Assigned',    label: 'Assigned',    icon: 'person',   badge: 'bg-blue-100 text-blue-700',    defaultOpen: true },
    { key: 'Ongoing',     label: 'Ongoing',     icon: 'sync',     badge: 'bg-purple-100 text-purple-700',defaultOpen: true },
  ];

  const tableProps = { profiles, containers, workItems, currentUser, startWorkItem, completeWorkItem, updateWorkItem, deleteWorkItem, onAddSubtask, showAssignee, childrenOf };

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
function HistoryTable({ items, profiles, containers, workItems, currentUser, createFollowUpTask }) {
  const [expandedId, setExpandedId] = useState(null);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const showAssignee = currentUser?.role !== 'Assignee';
  const colCount = showAssignee ? 4 : 3;
  const canFollowUp = currentUser?.role === 'Admin' && !!createFollowUpTask;

  const renderRow = (item) => {
    const isExpanded = expandedId === item.id;
    const assigneeName = (profiles || []).find(p => p.id === item.assignee_id)?.name ?? 'Unassigned';
    const resolution = getResolutionStatus(item);
    const children = (workItems || []).filter(w => w.parent_id === item.id && !w.is_recurring);

    return (
      <React.Fragment key={item.id}>
        <tr className="cursor-pointer hover:bg-surface-container-low/40 transition-colors"
          onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}>
          <td className="w-8 px-3 py-3">
            <span className={`material-symbols-outlined text-[18px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
          </td>
          <td className="px-2 py-3 max-w-[260px]">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-on-surface leading-tight line-clamp-1">{item.title}</span>
              {children.length > 0 && <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">{children.length} sub</span>}
            </div>
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
                onFollowUp={canFollowUp ? (i) => setFollowUpTarget(i) : undefined}
                showActions={false} />
            </td>
          </tr>
        )}
        {children.map(child => {
          const cds = getDisplayStatus(child);
          return (
            <tr key={child.id} className="bg-surface-container-lowest/40">
              <td className="w-8 px-3 py-2" />
              <td className="px-2 py-2 max-w-[260px]" colSpan={showAssignee ? 1 : 2}>
                <div className="flex items-center gap-1.5 pl-5">
                  <span className="text-on-surface-variant text-xs flex-shrink-0">↳</span>
                  <span className={`text-xs font-medium leading-tight line-clamp-1 ${cds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{child.title}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeClass(child.status === 'Completed' ? 'Completed' : cds)}`}>{cds}</span>
                </div>
              </td>
              {showAssignee && <td className="px-2 py-2 text-[10px] text-on-surface-variant">{((profiles || []).find(p => p.id === child.assignee_id)?.name ?? '').split(' ')[0]}</td>}
              <td className="px-2 py-2" />
            </tr>
          );
        })}
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
      {followUpTarget && (
        <FollowUpModal
          completedItem={followUpTarget}
          profiles={profiles || []}
          currentUser={currentUser}
          onCancel={() => setFollowUpTarget(null)}
          onConfirm={async (data) => {
            await createFollowUpTask(followUpTarget.id, data);
            setFollowUpTarget(null);
          }}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AllTasksPage() {
  const {
    workItems, profiles, currentUser, containers,
    startWorkItem, completeWorkItem, createFollowUpTask, addWorkItem, updateWorkItem, deleteWorkItem,
  } = useDataContext();

  const [activeTab, setActiveTab]           = useState('Active');
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStaff, setFilterStaff]       = useState('');
  const [filterDept, setFilterDept]         = useState('');
  const [staffGroup, setStaffGroup]         = useState('Office Staff');
  const [pendingCompleteId, setPendingCompleteId] = useState(null);
  const [historyFilter, setHistoryFilter]   = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo]   = useState('');

  const handleCompleteClick = (itemId) => setPendingCompleteId(itemId);
  const handleCompleteConfirm = async ({ note, tag, followUp }) => {
    if (!pendingCompleteId) return;
    await completeWorkItem(pendingCompleteId, { note, tag });
    if (followUp?.title && followUp?.dueDate) {
      await createFollowUpTask(pendingCompleteId, {
        title: followUp.title, dueDate: followUp.dueDate,
        assigneeId: followUp.assigneeId, linkType: 'Continuation',
      });
    }
    setPendingCompleteId(null);
  };

  const safeWorkItems  = workItems  || [];
  const safeProfiles   = profiles   || [];
  const safeContainers = containers || [];

  let baseRaw = safeWorkItems.filter(w => !w.in_planning_pool);
  if (currentUser?.role === 'Assignee') {
    baseRaw = baseRaw.filter(w => w.assignee_id === currentUser.id);
  } else {
    // Admin sees filtered group plus any unassigned works
    const targetStaffIds = new Set(safeProfiles.filter(p => p.role !== 'Admin' && p.category === staffGroup).map(p => p.id));
    baseRaw = baseRaw.filter(w => !w.assignee_id || targetStaffIds.has(w.assignee_id));
  }

  const allBase = baseRaw.filter(w => {
    const type = w.type?.toLowerCase();
    return type !== 'project' && type !== 'event' && type !== 'phase' && !w.parent_id;
  });

  const deptList = ['All Departments', ...new Set(safeProfiles.filter(p => p.role !== 'Admin' && p.category === staffGroup).map(p => p.department).filter(Boolean))];
  const staffListForFilter = safeProfiles.filter(p => p.role !== 'Admin' && p.category === staffGroup && (!filterDept || filterDept === 'All Departments' || p.department === filterDept));

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
    if (!w.expected_date)         return true;  // no date → Assigned group
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
  const historyAll = sortByStatus(applyFilters(allBase.filter(w => w.status === 'Completed')));

  // History section splits
  const yest       = offsetDate(-1);
  const weekMon    = weekMondayStr();
  const historyToday     = historyAll.filter(w => getCompletedDate(w) === today);
  const historyYesterday = historyAll.filter(w => getCompletedDate(w) === yest);
  const historyThisWeek  = historyAll.filter(w => { const cd = getCompletedDate(w); return cd >= weekMon && cd !== today && cd !== yest; });
  const historyOld       = historyAll.filter(w => { const cd = getCompletedDate(w); return cd !== today && cd !== yest && (!cd || cd < weekMon); });

  // History date filter
  const historyFiltered = (() => {
    if (!historyFilter) return historyAll;
    const monthStart = today.substring(0, 7) + '-01';
    return historyAll.filter(w => {
      const cd = getCompletedDate(w);
      if (historyFilter === 'today')  return cd === today;
      if (historyFilter === 'week')   return cd >= weekMon && cd <= today;
      if (historyFilter === 'month')  return cd >= monthStart && cd <= today;
      if (historyFilter === 'custom') return (!historyDateFrom || cd >= historyDateFrom) && (!historyDateTo || cd <= historyDateTo);
      return true;
    });
  })();

  const historyItems   = historyAll;
  const upcomingCount  = tomorrowItems.length + next3Days.length + thisWeek.length + laterItems.length;

  const handleAddSubtask = async (parentItem, { title, date, assigneeId, estimatedHours }) => {
    await addWorkItem({
      title,
      expected_date: date || null,
      assignee_id: assigneeId || parentItem.assignee_id || null,
      status: 'Assigned',
      type: 'Subtask',
      parent_id: parentItem.id,
      ...(estimatedHours ? { estimated_hours: parseFloat(estimatedHours) } : {}),
    });
    if (date && !parentItem.expected_date) {
      await updateWorkItem(parentItem.id, { expected_date: date });
    }
    // Clear parent's own estimated_hours when a subtask with hours is added — parent time = sum of subs
    if (estimatedHours && parentItem.estimated_hours) {
      await updateWorkItem(parentItem.id, { estimated_hours: null });
    }
  };

  const sharedProps = { profiles: safeProfiles, containers: safeContainers, workItems: safeWorkItems, currentUser, startWorkItem, completeWorkItem: handleCompleteClick, updateWorkItem, deleteWorkItem, onAddSubtask: handleAddSubtask };

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
        {currentUser?.role === 'Admin' && (
          <div className="flex bg-surface-container rounded-xl p-1 gap-0.5 w-full md:w-auto">
            <button onClick={() => { setStaffGroup('Office Staff'); setFilterStaff(''); setFilterDept(''); }} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${staffGroup === 'Office Staff' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
              Office Staff
            </button>
            <button onClick={() => { setStaffGroup('Institution'); setFilterStaff(''); setFilterDept(''); }} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${staffGroup === 'Institution' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
              Institution
            </button>
          </div>
        )}
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
        <div className="flex flex-col gap-4">
          {/* History date filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-surface-container rounded-xl p-1 gap-0.5">
              {[['', 'All'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['custom', 'Custom']].map(([val, label]) => (
                <button key={val} onClick={() => { setHistoryFilter(val); if (val !== 'custom') { setHistoryDateFrom(''); setHistoryDateTo(''); } }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${historyFilter === val ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {label}
                </button>
              ))}
            </div>
            {historyFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)}
                  className="bg-white border border-outline-variant/40 rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <span className="text-xs text-on-surface-variant font-bold">→</span>
                <input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)}
                  className="bg-white border border-outline-variant/40 rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
          </div>

          {/* When filter active: flat list */}
          {historyFilter ? (
            <HistoryTable items={historyFiltered} {...sharedProps} createFollowUpTask={createFollowUpTask} />
          ) : (
            /* Sectioned: Today / Yesterday / This Week / Old */
            <div className="flex flex-col gap-5">
              {historyToday.length > 0 && (
                <Section icon="today" title="Today" count={historyToday.length} badge="bg-green-100 text-green-700" defaultOpen>
                  <HistoryTable items={historyToday} {...sharedProps} createFollowUpTask={createFollowUpTask} />
                </Section>
              )}
              {historyYesterday.length > 0 && (
                <Section icon="history" title="Yesterday" count={historyYesterday.length} badge="bg-blue-100 text-blue-700" defaultOpen>
                  <HistoryTable items={historyYesterday} {...sharedProps} createFollowUpTask={createFollowUpTask} />
                </Section>
              )}
              {historyThisWeek.length > 0 && (
                <Section icon="view_week" title="This Week" count={historyThisWeek.length} badge="bg-primary-container text-on-primary-container" defaultOpen>
                  <HistoryTable items={historyThisWeek} {...sharedProps} createFollowUpTask={createFollowUpTask} />
                </Section>
              )}
              {historyOld.length > 0 && (
                <Section icon="schedule" title="Older" count={historyOld.length} badge="bg-surface-container text-on-surface-variant" defaultOpen={false}>
                  <HistoryTable items={historyOld} {...sharedProps} createFollowUpTask={createFollowUpTask} />
                </Section>
              )}
              {historyAll.length === 0 && (
                <div className="bg-white rounded-xl border border-outline-variant/30 py-16 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 block text-outline">history</span>
                  <p className="font-bold">No completed items yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {pendingCompleteId && (
        <CompletionPanel
          item={safeWorkItems.find(w => w.id === pendingCompleteId)}
          profiles={safeProfiles}
          currentUser={currentUser}
          onConfirm={handleCompleteConfirm}
          onCancel={() => setPendingCompleteId(null)}
        />
      )}

    </div>
  );
}
