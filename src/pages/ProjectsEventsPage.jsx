import { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, isPhaseActive } from '../lib/statusUtils';
import { StaffToggle } from '../components/common/FilterBar';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const cName    = (c) => c?.title ?? 'Untitled';
const todayStr = () => new Date().toISOString().split('T')[0];

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

const progressBar = (p) => (
  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
    <div className={`h-full rounded-full transition-all duration-500 ${p >= 80 ? 'bg-green-500' : p >= 40 ? 'bg-primary' : 'bg-amber-400'}`}
      style={{ width: `${Math.max(0, Math.min(100, p ?? 0))}%` }} />
  </div>
);

const STATUS_ORDER = { Overdue: 0, 'Not Started': 1, Assigned: 2, Ongoing: 3, Completed: 4 };
const sortByStatus = (items) =>
  [...items].sort((a, b) => (STATUS_ORDER[getDisplayStatus(a)] ?? 5) - (STATUS_ORDER[getDisplayStatus(b)] ?? 5));

function buildCounts(items) {
  const c = { assigned: 0, ongoing: 0, completed: 0, overdue: 0, notStarted: 0 };
  items.forEach(t => {
    const ds = getDisplayStatus(t);
    if (ds === 'Completed')    c.completed++;
    else if (ds === 'Overdue') c.overdue++;
    else if (ds === 'Ongoing') c.ongoing++;
    else if (ds === 'Assigned') c.assigned++;
    else c.notStarted++;
  });
  return c;
}

const StatusDot = ({ ds }) => {
  const cls = ds === 'Completed' ? 'bg-green-500' : ds === 'Overdue' ? 'bg-red-500' : ds === 'Ongoing' ? 'bg-blue-500' : 'bg-outline-variant';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
};

const Chip = ({ label, value, cls }) => value > 0 ? (
  <div className="flex flex-col items-center min-w-[36px]">
    <span className={`text-sm font-black ${cls}`}>{value}</span>
    <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant leading-none mt-0.5">{label}</span>
  </div>
) : null;

const statusBadge = (ds) => {
  const cls = ds === 'Completed' ? 'bg-green-100 text-green-700' : ds === 'Overdue' ? 'bg-red-100 text-red-700' : ds === 'Ongoing' ? 'bg-blue-100 text-blue-700' : ds === 'Not Started' ? 'bg-amber-100 text-amber-700' : 'bg-surface-container text-on-surface-variant';
  return <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${cls}`}>{ds}</span>;
};

const getRecurrenceLabel = (rule) => {
  if (!rule) return 'Custom';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (rule.type === 'daily')          return 'Daily';
  if (rule.type === 'weekly')         return `Weekly (${days[rule.day] ?? 'Mon'})`;
  if (rule.type === 'monthly')        return `Monthly (day ${rule.date})`;
  if (rule.type === 'every_x_days')   return `Every ${rule.interval} days`;
  if (rule.type === 'every_x_months') return `Every ${rule.interval} months`;
  return 'Custom';
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Inline delete confirm: first click shows confirm, second click deletes
function DeleteBtn({ onDelete, size = 'sm' }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) return (
    <div className="flex items-center gap-1">
      <button onClick={() => { onDelete(); setConfirming(false); }}
        className="text-[9px] font-bold bg-error text-white px-2 py-0.5 rounded-lg hover:opacity-90">Confirm</button>
      <button onClick={() => setConfirming(false)}
        className="text-[9px] font-bold bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-lg">Cancel</button>
    </div>
  );
  return (
    <button onClick={() => setConfirming(true)}
      className={`text-on-surface-variant hover:text-error transition-colors ${size === 'xs' ? 'opacity-0 group-hover:opacity-100' : ''}`}>
      <span className="material-symbols-outlined text-[16px]">delete</span>
    </button>
  );
}

// Edit checklist/milestone item modal
function EditItemModal({ item, profiles, onClose, onSave }) {
  const [title, setTitle] = useState(item.title || '');
  const [assigneeId, setAssigneeId] = useState(item.assignee_id || '');
  const [date, setDate] = useState(item.expected_date || '');
  const [saving, setSaving] = useState(false);
  const cls = "border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";
  const save = async () => {
    setSaving(true);
    await onSave(item.id, { title: title.trim() || item.title, assignee_id: assigneeId || null, expected_date: date || null });
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-on-surface">Edit Item</h3>
        <input className={cls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
        <select className={cls} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">— Unassigned —</option>
          {(profiles || []).filter(p => p.role !== 'Admin').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" className={cls} value={date} onChange={e => setDate(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm font-bold text-on-surface-variant border border-outline-variant/40 rounded-xl">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const inputCls    = "border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";
const btnPrimary  = "bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40";
const btnSecondary = "bg-white border border-outline-variant/40 text-on-surface px-4 py-2 rounded-xl text-sm font-bold hover:bg-surface-container transition-colors";

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectsEventsPage() {
  const {
    containers, workItems, profiles, currentUser,
    addContainer, updateContainer, addWorkItem, updateWorkItem, deleteWorkItem,
    staffGroup,
  } = useDataContext();


  const [typeTab, setTypeTab]       = useState('Projects');
  const [modeTab, setModeTab]       = useState('Active');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTplId, setSelectedTplId] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen]       = useState(false);
  const [newTitle, setNewTitle]               = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [milestoneTarget, setMilestoneTarget] = useState(null);
  const [milestoneForm, setMilestoneForm]     = useState({ title: '', date: '' });
  const [phaseTarget, setPhaseTarget]         = useState(null);
  const [phaseForm, setPhaseForm]             = useState({ title: '', date: '' });
  const [checklistTarget, setChecklistTarget] = useState(null);
  const [checklistForm, setChecklistForm]     = useState({ title: '', assignee_id: '', date: '' });
  const [editNameId, setEditNameId]           = useState(null);
  const [editNameVal, setEditNameVal]         = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deploying, setDeploying]             = useState(false);
  const [editingItem, setEditingItem]         = useState(null);

  const safeContainers = containers ?? [];
  const safeWorkItems  = workItems  ?? [];
  const safeProfiles   = profiles   ?? [];
  const isAdmin        = currentUser?.role === 'Admin';
  const filteredProfiles = safeProfiles.filter(p =>
    p.role !== 'Admin' && (p.category || 'Office Staff') === staffGroup
  );

  const getProfile    = (id) => safeProfiles.find(p => p.id === id);
  const containerType = typeTab === 'Projects' ? 'Project' : typeTab === 'Events' ? 'Event' : null;

  // ── Container filters ──────────────────────────────────────────────────────
  const visibleContainers = safeContainers.filter(c => {
    if (c.type !== containerType)  return false;
    if (c.is_active === false)     return false;
    if (currentUser?.role === 'Assignee') {
      return safeWorkItems.some(w => w.container_id === c.id && w.assignee_id === currentUser.id);
    }
    return true;
  });
  const activeContainers   = visibleContainers.filter(c => !c.is_template);
  const templateContainers = visibleContainers.filter(c =>  c.is_template);

  // ── Work-item helpers ──────────────────────────────────────────────────────
  const getActionable  = (cid) => safeWorkItems.filter(w => w.container_id === cid && !w.in_planning_pool && w.type !== 'Phase');
  const getPhases      = (cid) => safeWorkItems.filter(w => w.container_id === cid && w.type === 'Phase').sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const getPhaseItems  = (pid) => safeWorkItems.filter(w => w.parent_id === pid);
  const getMilestones  = (cid) => safeWorkItems.filter(w => w.container_id === cid && w.type === 'Milestone');

  // Standalone tasks (no container) with their subtasks
  const standaloneTasks = safeWorkItems.filter(w =>
    !w.container_id && !w.in_planning_pool && !w.is_recurring && w.type === 'Task' &&
    !w.parent_id && (currentUser?.role === 'Assignee' ? w.assignee_id === currentUser.id : true)
  );
  const getSubItems = (pid) => safeWorkItems.filter(w => w.parent_id === pid);

  // Recurring templates
  const recurringTemplates = safeWorkItems.filter(w => w.is_recurring &&
    (currentUser?.role === 'Assignee' ? w.assignee_id === currentUser.id : true)
  );

  // ── Container actions ──────────────────────────────────────────────────────
  const mkContainer = (fields) => {
    const p = { title: fields.title, type: fields.type, created_by: currentUser.id };
    if (fields.source_template_id)        p.source_template_id = fields.source_template_id;
    return p;
  };

  const submitCreate = async (asTemplate) => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    await addContainer(mkContainer({ title: newTitle.trim(), type: containerType, is_template: asTemplate }));
    setSubmitting(false);
    setIsCreateOpen(false); setNewTitle('');
    setModeTab(asTemplate ? 'Saved' : 'Active');
  };

  const saveAsTemplate = async (c) => {
    const { data: tpl } = await addContainer(mkContainer({ title: cName(c), type: c.type, is_template: true }));
    if (!tpl?.length) return;
    const tplId = tpl[0].id;
    for (const m of getMilestones(c.id)) await addWorkItem({ title: m.title, type: 'Milestone', container_id: tplId, status: 'Assigned', created_by: currentUser.id, expected_date: m.expected_date ?? null });
    await updateContainer(c.id, { source_template_id: tplId });
    setModeTab('Saved');
  };

  const deployTemplate = async (tpl) => {
    setDeploying(true);
    const { data: newCont } = await addContainer(mkContainer({ title: cName(tpl), type: tpl.type, is_template: false, source_template_id: tpl.id }));
    if (!newCont?.length) { setDeploying(false); return; }
    const newId = newCont[0].id;
    if (tpl.type === 'Event') {
      for (const ph of getPhases(tpl.id)) {
        const { data: newPh } = await addWorkItem({ title: ph.title, type: 'Phase', container_id: newId, status: 'Assigned', created_by: currentUser.id, expected_date: ph.expected_date ?? null });
        for (const item of getPhaseItems(ph.id)) await addWorkItem({ title: item.title, type: 'Checklist', container_id: newId, parent_id: newPh?.[0]?.id ?? null, status: 'Assigned', assignee_id: item.assignee_id ?? null, created_by: currentUser.id, expected_date: ph.expected_date ?? null });
      }
    } else {
      for (const m of getMilestones(tpl.id)) await addWorkItem({ title: m.title, type: 'Milestone', container_id: newId, status: 'Assigned', created_by: currentUser.id, expected_date: m.expected_date ?? null });
    }
    setDeploying(false); setModeTab('Active');
  };

  const submitMilestone = async () => {
    if (!milestoneForm.title.trim() || !milestoneTarget) return;
    setSubmitting(true);
    await addWorkItem({ title: milestoneForm.title.trim(), type: 'Milestone', container_id: milestoneTarget, status: 'Assigned', created_by: currentUser.id, expected_date: milestoneForm.date || null });
    setSubmitting(false); setMilestoneTarget(null); setMilestoneForm({ title: '', date: '' });
  };

  const submitPhase = async () => {
    if (!phaseForm.title.trim() || !phaseTarget) return;
    setSubmitting(true);
    await addWorkItem({ title: phaseForm.title.trim(), type: 'Phase', container_id: phaseTarget, status: 'Assigned', created_by: currentUser.id, expected_date: phaseForm.date || null });
    setSubmitting(false); setPhaseTarget(null); setPhaseForm({ title: '', date: '' });
  };

  const submitChecklist = async () => {
    if (!checklistForm.title.trim() || !checklistTarget) return;
    setSubmitting(true);
    const containerId = safeWorkItems.find(w => w.id === checklistTarget.phaseId)?.container_id;
    await addWorkItem({ title: checklistForm.title.trim(), type: 'Checklist', container_id: containerId, parent_id: checklistTarget.phaseId, status: 'Assigned', assignee_id: checklistForm.assignee_id || null, created_by: currentUser.id, expected_date: checklistForm.date || checklistTarget.phaseDate || null });
    setSubmitting(false); setChecklistTarget(null); setChecklistForm({ title: '', assignee_id: '', date: '' });
  };

  const commitEditName = async () => {
    if (!editNameVal.trim() || !editNameId) return;
    await updateContainer(editNameId, { title: editNameVal.trim() }); setEditNameId(null);
  };

  const doDeactivate = async (c, saveFirst) => {
    if (saveFirst) await saveAsTemplate(c);
    await updateContainer(c.id, { is_active: false });
    setDeactivateTarget(null); setExpandedId(null);
  };

  const selectedTpl = templateContainers.find(c => c.id === selectedTplId) ?? templateContainers[0];

  // ─────────────────────────────────────────────────────────────────────────
  // INNER COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Milestone table (shared between active & saved) ────────────────────────
  function MilestoneTable({ milestones, showStatus, containerId }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant border-b border-surface-container-high">
            <tr>
              <th className="px-3 py-2">Milestone</th>
              <th className="px-3 py-2">Assignee</th>
              {showStatus && <th className="px-3 py-2">Status</th>}
              {showStatus && <th className="px-3 py-2">Deadline</th>}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {milestones.length === 0 && (
              <tr><td colSpan={showStatus ? 5 : 3} className="px-3 py-6 text-center text-on-surface-variant italic text-xs">No milestones yet.</td></tr>
            )}
            {milestones.map(m => {
              const ds = getDisplayStatus(m);
              const assignee = getProfile(m.assignee_id);
              return (
                <tr key={m.id} className="group hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {showStatus && <StatusDot ds={ds} />}
                      <span className={`font-medium ${ds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{m.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary flex-shrink-0">{getInitials(assignee.name)}</div>
                        <span className="text-xs text-on-surface-variant">{assignee.name.split(' ')[0]}</span>
                      </div>
                    ) : <span className="text-xs text-on-surface-variant/50 italic">Unassigned</span>}
                  </td>
                  {showStatus && <td className="px-3 py-2.5">{statusBadge(ds)}</td>}
                  {showStatus && <td className="px-3 py-2.5 text-xs text-on-surface-variant">{m.expected_date ?? '—'}</td>}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      {showStatus && ds !== 'Completed' && ds !== 'Overdue' && (
                        <button onClick={() => updateWorkItem(m.id, { expected_date: todayStr() })}
                          className="flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                          <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                        </button>
                      )}
                      <button onClick={() => setEditingItem(m)} className="text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      {isAdmin && <DeleteBtn onDelete={() => deleteWorkItem(m.id)} size="xs" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isAdmin && (
          <div className="px-3 py-2 border-t border-surface-container-low">
            <button onClick={() => setMilestoneTarget(containerId)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Milestone
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Checklist table (active event phases) ─────────────────────────────────
  function ChecklistTable({ items, phaseId, phaseDate, showStatus }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant border-b border-surface-container-high">
            <tr>
              <th className="px-3 py-1.5">Subject</th>
              <th className="px-3 py-1.5">Assignee</th>
              {showStatus && <th className="px-3 py-1.5">Status</th>}
              <th className="px-3 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {items.length === 0 && (
              <tr><td colSpan={showStatus ? 4 : 3} className="px-3 py-4 text-center text-on-surface-variant italic text-xs">No items.</td></tr>
            )}
            {(showStatus ? sortByStatus(items) : items).map(item => {
              const ds = getDisplayStatus(item);
              const assignee = getProfile(item.assignee_id);
              return (
                <tr key={item.id} className="group hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {showStatus && <StatusDot ds={ds} />}
                      <span className={`font-medium leading-tight ${ds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{item.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {assignee ? (
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary flex-shrink-0">{getInitials(assignee.name)}</div>
                        <span className="text-xs text-on-surface-variant">{assignee.name.split(' ')[0]}</span>
                      </div>
                    ) : <span className="text-xs text-on-surface-variant/50 italic">Unassigned</span>}
                  </td>
                  {showStatus && <td className="px-3 py-2">{statusBadge(ds)}</td>}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 justify-end">
                      {showStatus && ds !== 'Completed' && ds !== 'Overdue' && (
                        <button onClick={() => updateWorkItem(item.id, { expected_date: todayStr() })}
                          className="flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                        </button>
                      )}
                      {!showStatus && (
                        <button onClick={() => setEditingItem(item)} className="text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                      )}
                      {isAdmin && <DeleteBtn onDelete={() => deleteWorkItem(item.id)} size="xs" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isAdmin && (
          <div className="px-3 py-2 border-t border-surface-container-low">
            <button onClick={() => { setChecklistTarget({ phaseId, phaseDate }); setChecklistForm({ title: '', assignee_id: '', date: '' }); }}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Item
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Active container card ─────────────────────────────────────────────────
  function ActiveCard({ c }) {
    const [phaseDateEdits, setPhaseDateEdits] = useState({});
    const isExpanded  = expandedId === c.id;
    const isProject   = c.type === 'Project';
    const progress    = c.progress ?? 0;
    const allItems    = getActionable(c.id);
    const counts      = buildCounts(allItems);
    const isFromTemplate = !!c.source_template_id;
    const isEditingName  = editNameId === c.id;

    return (
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${isExpanded ? 'border-primary/40' : 'border-outline-variant/30'}`}>
        <div className="p-5 cursor-pointer hover:bg-surface-container-low/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isProject ? 'bg-indigo-50' : 'bg-emerald-50'}`}>
                <span className={`material-symbols-outlined ${isProject ? 'text-indigo-600' : 'text-emerald-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isProject ? 'folder_open' : 'event'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface leading-tight">{cName(c)}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant flex-wrap">
                  {c.expected_date && <span>{c.expected_date}</span>}
                  <span>{allItems.length} items</span>
                  {isFromTemplate && <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">From Template</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-lg font-black text-on-surface leading-none">{progress}%</p>
                <p className="text-[10px] text-on-surface-variant">Done</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </div>
          </div>
          <div className="mt-3">{progressBar(progress)}</div>
          {allItems.length > 0 && (
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <Chip label="Done"    value={counts.completed}  cls="text-green-600" />
              <Chip label="Ongoing" value={counts.ongoing}    cls="text-blue-600" />
              <Chip label="Overdue" value={counts.overdue}    cls="text-red-600" />
              <Chip label="Assigned" value={counts.assigned}  cls="text-on-surface" />
              <Chip label="Pending" value={counts.notStarted} cls="text-amber-600" />
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="border-t border-surface-container-high">
            {isAdmin && (
              <div className="px-5 py-3 border-b border-surface-container-low flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {isEditingName ? (
                  <>
                    <input autoFocus className="flex-1 border border-outline-variant/50 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={editNameVal} onChange={e => setEditNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditName(); if (e.key === 'Escape') setEditNameId(null); }} />
                    <button onClick={commitEditName} className="text-xs font-bold text-primary hover:underline">Save</button>
                    <button onClick={() => setEditNameId(null)} className="text-xs font-bold text-on-surface-variant hover:underline">Cancel</button>
                  </>
                ) : isFromTemplate ? (
                  <button onClick={() => setModeTab('Saved')} className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit in Saved Templates
                  </button>
                ) : (
                  <button onClick={() => { setEditNameId(c.id); setEditNameVal(cName(c)); }} className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit Name
                  </button>
                )}
              </div>
            )}

            {/* Project: milestones table */}
            {isProject && (
              <div className="max-h-80 overflow-y-auto">
                <MilestoneTable milestones={getMilestones(c.id)} showStatus containerId={c.id} />
              </div>
            )}

            {/* Event: phases + checklist tables (active phases only) */}
            {!isProject && (
              <div className="px-5 py-4 flex flex-col gap-4 max-h-[480px] overflow-y-auto">
                {getPhases(c.id).map((ph, i) => {
                  const phItems  = getPhaseItems(ph.id);
                  const phActive = isPhaseActive(ph);
                  const phToday  = ph.expected_date === todayStr();
                  return (
                    <div key={ph.id} className={`rounded-xl border overflow-hidden ${phActive ? 'border-emerald-200' : 'border-outline-variant/20 opacity-60'}`}>
                      <div className={`px-4 py-2.5 flex items-center justify-between ${phActive ? 'bg-emerald-50/60' : 'bg-surface-container-low/40'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${phActive ? 'bg-emerald-500 text-white' : 'bg-outline-variant/40 text-on-surface-variant'}`}>{i + 1}</span>
                          <span className={`text-xs font-black uppercase tracking-wide ${phActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>{ph.title}</span>
                          {phActive && <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase">Active</span>}
                          {isAdmin ? (
                            <div className="flex items-center gap-1">
                              <input type="date" value={phaseDateEdits[ph.id] ?? ph.expected_date ?? ''}
                                onChange={e => setPhaseDateEdits(prev => ({ ...prev, [ph.id]: e.target.value }))}
                                className="text-[10px] border border-outline-variant/40 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white" />
                              {phaseDateEdits[ph.id] != null && phaseDateEdits[ph.id] !== (ph.expected_date ?? '') && (
                                <button onClick={async () => { await updateWorkItem(ph.id, { expected_date: phaseDateEdits[ph.id] || null }); setPhaseDateEdits(prev => { const n = { ...prev }; delete n[ph.id]; return n; }); }}
                                  className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-lg hover:opacity-90">Save</button>
                              )}
                            </div>
                          ) : (
                            <>
                              {ph.expected_date && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${phToday ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>{phToday ? 'Today' : ph.expected_date}</span>}
                              {!ph.expected_date && <span className="text-[9px] text-on-surface-variant italic">no date set</span>}
                            </>
                          )}
                        </div>
                        {isAdmin && (
                          <DeleteBtn onDelete={() => deleteWorkItem(ph.id)} />
                        )}
                      </div>
                      {phActive ? (
                        <ChecklistTable items={phItems} phaseId={ph.id} phaseDate={ph.expected_date} showStatus />
                      ) : (
                        <div className="px-4 py-3 text-xs text-on-surface-variant italic">
                          {phItems.length} item{phItems.length !== 1 ? 's' : ''} — unlocks when phase date ({ph.expected_date ?? 'unset'}) is reached.
                        </div>
                      )}
                    </div>
                  );
                })}
                {getPhases(c.id).length === 0 && <p className="text-sm text-on-surface-variant italic">No phases yet.</p>}
                {isAdmin && (
                  <button onClick={() => setPhaseTarget(c.id)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Phase
                  </button>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="px-5 py-3 border-t border-surface-container-low flex items-center gap-2 flex-wrap">
                {isProject && !isFromTemplate && (
                  <button onClick={() => saveAsTemplate(c)} className="flex items-center gap-1.5 text-xs font-bold border border-outline-variant/40 bg-white text-on-surface px-3 py-1.5 rounded-xl hover:bg-surface-container">
                    <span className="material-symbols-outlined text-[14px]">bookmark_add</span> Save as Template
                  </button>
                )}
                <button onClick={() => setDeactivateTarget(c)} className="flex items-center gap-1.5 text-xs font-bold text-error border border-error/20 bg-error/5 px-3 py-1.5 rounded-xl hover:bg-error/10 ml-auto">
                  <span className="material-symbols-outlined text-[14px]">pause_circle</span> Deactivate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Tasks tab — standalone tasks with subtasks flat ───────────────────────
  function TasksActive() {
    const sorted = sortByStatus(standaloneTasks);
    if (sorted.length === 0) return (
      <div className="bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-outline mb-3 block">assignment</span>
        <p className="font-bold text-on-surface-variant">No standalone tasks.</p>
      </div>
    );
    return (
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
            <tr>
              <th className="px-4 py-2.5">Task</th>
              <th className="px-3 py-2.5">Assignee</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Due</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {sorted.map(task => {
              const subItems = sortByStatus(getSubItems(task.id));
              const ds       = getDisplayStatus(task);
              const assignee = getProfile(task.assignee_id);
              return [
                <tr key={task.id} className={`group transition-colors ${ds === 'Overdue' ? 'bg-red-50/60' : ds === 'Not Started' ? 'bg-amber-50/40' : 'hover:bg-surface-container-low/40'}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusDot ds={ds} />
                      <span className={`font-semibold leading-tight ${ds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{task.title}</span>
                      {subItems.length > 0 && <span className="text-[9px] font-bold bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded">{subItems.length} sub</span>}
                    </div>
                    {task.description && <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5 pl-4">{task.description}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary">{getInitials(assignee.name)}</div>
                        <span className="text-xs text-on-surface-variant">{assignee.name.split(' ')[0]}</span>
                      </div>
                    ) : <span className="text-xs text-on-surface-variant/50">—</span>}
                  </td>
                  <td className="px-3 py-2.5">{statusBadge(ds)}</td>
                  <td className="px-3 py-2.5 text-xs text-on-surface-variant">{task.expected_date ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      {ds !== 'Completed' && ds !== 'Overdue' && (
                        <button onClick={() => updateWorkItem(task.id, { expected_date: todayStr() })}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                          <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                        </button>
                      )}
                      {isAdmin && <DeleteBtn onDelete={() => deleteWorkItem(task.id)} size="xs" />}
                    </div>
                  </td>
                </tr>,
                // Subtasks inline (no expand needed)
                ...subItems.map(sub => {
                  const sds = getDisplayStatus(sub);
                  const subAssignee = getProfile(sub.assignee_id);
                  return (
                    <tr key={sub.id} className="group bg-surface-container-low/20 hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-2 pl-10">
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant text-[11px]">↳</span>
                          <StatusDot ds={sds} />
                          <span className={`text-xs font-medium ${sds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{sub.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {subAssignee ? (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-black text-primary">{getInitials(subAssignee.name)}</div>
                            <span className="text-[10px] text-on-surface-variant">{subAssignee.name.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-xs text-on-surface-variant/50">—</span>}
                      </td>
                      <td className="px-3 py-2">{statusBadge(sds)}</td>
                      <td className="px-3 py-2 text-[11px] text-on-surface-variant">{sub.expected_date ?? '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          {sds !== 'Completed' && sds !== 'Overdue' && (
                            <button onClick={() => updateWorkItem(sub.id, { expected_date: todayStr() })}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                              <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                            </button>
                          )}
                          {isAdmin && <DeleteBtn onDelete={() => deleteWorkItem(sub.id)} size="xs" />}
                        </div>
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Recurring section ──────────────────────────────────────────────────────
  function RecurringSection() {
    const [editingRec, setEditingRec] = useState(null);
    const [modalData, setModalData]   = useState({});
    const [saving, setSaving]         = useState(false);

    const canEdit = isAdmin || currentUser?.role === 'Manager';

    const openEdit = (item) => {
      setEditingRec(item);
      setModalData({
        title:           item.title || '',
        description:     item.description || '',
        assignee_id:     item.assignee_id || '',
        priority:        item.priority || 'Medium',
        expected_date:   item.expected_date || '',
        is_active:       item.is_active ?? true,
        recurrence_type: item.recurrence_rule?.type || 'daily',
        recurrence_day:  item.recurrence_rule?.day  ?? '',
        recurrence_date: item.recurrence_rule?.date ?? '',
      });
    };

    const saveEdit = async () => {
      if (!editingRec) return;
      setSaving(true);
      const rule = { type: modalData.recurrence_type };
      if (modalData.recurrence_type === 'weekly')  rule.day  = Number(modalData.recurrence_day);
      if (modalData.recurrence_type === 'monthly') rule.date = Number(modalData.recurrence_date);
      await updateWorkItem(editingRec.id, {
        title:           modalData.title.trim() || editingRec.title,
        description:     modalData.description || null,
        assignee_id:     modalData.assignee_id || null,
        priority:        modalData.priority,
        expected_date:   modalData.expected_date || null,
        is_active:       modalData.is_active,
        recurrence_rule: rule,
      });
      setSaving(false); setEditingRec(null);
    };

    const fieldCls = "bg-slate-50 border border-outline-variant rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";
    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    return (
      <>
        {editingRec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingRec(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high">
                <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">repeat</span> Edit Recurring Task
                </h2>
                <button onClick={() => setEditingRec(null)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                <input className={fieldCls} value={modalData.title} onChange={e => setModalData(d => ({...d, title: e.target.value}))} placeholder="Task title" />
                <textarea className={fieldCls + ' resize-none'} rows={2} value={modalData.description} onChange={e => setModalData(d => ({...d, description: e.target.value}))} placeholder="Description" />
                <select className={fieldCls} value={modalData.assignee_id} onChange={e => setModalData(d => ({...d, assignee_id: e.target.value}))}>
                  <option value="">— Unassigned —</option>
                  {filteredProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select className={fieldCls} value={modalData.priority} onChange={e => setModalData(d => ({...d, priority: e.target.value}))}>
                    {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="date" className={fieldCls} value={modalData.expected_date} onChange={e => setModalData(d => ({...d, expected_date: e.target.value}))} />
                </div>
                <select className={fieldCls} value={modalData.recurrence_type} onChange={e => setModalData(d => ({...d, recurrence_type: e.target.value}))}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {modalData.recurrence_type === 'weekly' && (
                  <select className={fieldCls} value={modalData.recurrence_day} onChange={e => setModalData(d => ({...d, recurrence_day: e.target.value}))}>
                    <option value="">— Select day —</option>
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                )}
                {modalData.recurrence_type === 'monthly' && (
                  <input type="number" min={1} max={31} className={fieldCls} value={modalData.recurrence_date} onChange={e => setModalData(d => ({...d, recurrence_date: e.target.value}))} placeholder="Day of month (1–31)" />
                )}
                <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-on-surface">Active</p>
                  <button type="button" onClick={() => setModalData(d => ({...d, is_active: !d.is_active}))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${modalData.is_active ? 'bg-primary' : 'bg-outline-variant'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${modalData.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface-container-high flex gap-3 justify-end">
                <button onClick={() => setEditingRec(null)} className="px-4 py-2 text-sm font-bold text-on-surface-variant border border-outline-variant rounded-xl">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                  <th className="px-5 py-3">Task</th>
                  <th className="px-4 py-3">Recurrence</th>
                  <th className="px-4 py-3">Last Generated</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {recurringTemplates.length === 0
                  ? <tr><td colSpan={canEdit ? 6 : 5} className="px-6 py-16 text-center text-on-surface-variant font-bold text-sm">No recurring tasks configured.</td></tr>
                  : recurringTemplates.map(item => {
                    const aName    = safeProfiles.find(p => p.id === item.assignee_id)?.name ?? 'Unassigned';
                    const initials = getInitials(aName);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="px-5 py-3">
                          <span className="text-sm font-semibold text-on-surface">{item.title}</span>
                          {item.description && <p className="text-[11px] text-on-surface-variant line-clamp-1">{item.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">{getRecurrenceLabel(item.recurrence_rule)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">{item.last_generated_at ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-surface-dim border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold">{initials}</div>
                            <span className="text-xs text-on-surface-variant">{aName.split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                            {item.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEdit(item)} className="text-xs font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ml-auto">
                              <span className="material-symbols-outlined text-[13px]">edit</span>Edit
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
      </>
    );
  }

  // ── Saved templates panel ──────────────────────────────────────────────────
  function SavedPanel() {
    if (templateContainers.length === 0) return (
      <div className="bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-outline mb-3 block">library_books</span>
        <p className="font-bold text-on-surface-variant">No saved templates yet.</p>
      </div>
    );

    const active     = selectedTpl ?? templateContainers[0];
    const isProject  = active?.type === 'Project';
    const phases     = isProject ? [] : getPhases(active?.id);
    const milestones = getMilestones(active?.id);
    const isTplEditingName = editNameId === active?.id;

    return (
      <div className="flex gap-4 min-h-[520px]">
        {/* Template list */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Templates <span className="text-primary">{templateContainers.length}</span></p>
          <div className="flex flex-col gap-2">
            {templateContainers.map(c => {
              const isSel = (selectedTplId ?? templateContainers[0]?.id) === c.id;
              return (
                <div key={c.id} onClick={() => setSelectedTplId(c.id)}
                  className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all ${isSel ? 'border-primary shadow-sm' : 'border-outline-variant/30 hover:border-primary/40'}`}>
                  <p className="font-bold text-on-surface text-sm leading-tight mb-2">{cName(c)}</p>
                  <div className="flex gap-2">
                    <button onClick={e => { e.stopPropagation(); deployTemplate(c); }} disabled={deploying}
                      className="flex-1 py-1.5 text-xs font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50">{deploying ? '…' : 'Deploy'}</button>
                    <button onClick={e => { e.stopPropagation(); setSelectedTplId(c.id); }}
                      className="flex-1 py-1.5 text-xs font-bold border border-outline-variant/40 rounded-xl hover:bg-surface-container text-on-surface">View</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Template detail */}
        <div className="flex-1 bg-white rounded-2xl border border-outline-variant/30 overflow-hidden flex flex-col">
          {active ? (
            <>
              <div className="px-6 py-4 border-b border-surface-container-high">
                {isTplEditingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input autoFocus className="flex-1 border border-outline-variant/50 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none"
                      value={editNameVal} onChange={e => setEditNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditName(); if (e.key === 'Escape') setEditNameId(null); }} />
                    <button onClick={commitEditName} className="text-xs font-bold text-primary hover:underline">Save</button>
                    <button onClick={() => setEditNameId(null)} className="text-xs font-bold text-on-surface-variant hover:underline">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-extrabold text-on-surface">{cName(active)}</h2>
                    {isAdmin && <button onClick={() => { setEditNameId(active.id); setEditNameVal(cName(active)); }} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">edit</span></button>}
                  </div>
                )}
                <p className="text-xs text-on-surface-variant">{isProject ? `${milestones.length} milestones` : `${phases.length} phases`}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {isProject ? (
                  <MilestoneTable milestones={milestones} showStatus={false} containerId={active.id} />
                ) : (
                  <>
                    {phases.map((ph, i) => {
                      const items = getPhaseItems(ph.id);
                      return (
                        <div key={ph.id} className="rounded-xl border border-outline-variant/20 overflow-hidden">
                          <div className="px-4 py-2.5 bg-surface-container-low/40 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                              <h3 className="text-xs font-black text-on-surface uppercase tracking-wide">{ph.title}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <div className="flex gap-1">
                                  <button onClick={() => { setChecklistTarget({ phaseId: ph.id, phaseDate: ph.expected_date }); setChecklistForm({ title: '', assignee_id: '', date: '' }); }}
                                    className="flex items-center gap-1 text-[11px] font-bold bg-primary text-white px-2 py-0.5 rounded-lg hover:opacity-90">
                                    <span className="material-symbols-outlined text-[12px]">add</span> Add
                                  </button>
                                  <DeleteBtn onDelete={() => deleteWorkItem(ph.id)} />
                                </div>
                              )}
                            </div>
                          </div>
                          <ChecklistTable items={items} phaseId={ph.id} phaseDate={ph.expected_date} showStatus={false} />
                        </div>
                      );
                    })}
                    {phases.length === 0 && <p className="text-sm text-on-surface-variant italic">No phases yet.</p>}
                    {isAdmin && (
                      <button onClick={() => setPhaseTarget(active.id)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Phase
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-surface-container-high flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Deploy creates a live {isProject ? 'project' : 'event'} from this template</span>
                <button onClick={() => deployTemplate(active)} disabled={deploying}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {deploying
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Deploying…</>
                    : <><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Deploy {isProject ? 'Project' : 'Event'}</>
                  }
                </button>
              </div>
            </>
          ) : <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">Select a template.</div>}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto pb-24 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Works Hub</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">{typeTab}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
            {[
              { key: 'Projects', icon: 'folder_open',  color: 'text-indigo-600' },
              { key: 'Events',   icon: 'event',         color: 'text-emerald-600' },
              { key: 'Tasks',    icon: 'assignment',    color: 'text-primary' },
            ].map(({ key, icon, color }) => (
              <button key={key}
                onClick={() => { setTypeTab(key); setExpandedId(null); setSelectedTplId(null); setModeTab('Active'); }}
                className={`px-3.5 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${typeTab === key ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className={`material-symbols-outlined text-[15px] ${typeTab === key ? color : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <span className="hidden sm:inline">{key}</span>
              </button>
            ))}
          </div>
          <StaffToggle />
        </div>

        {typeTab !== 'Tasks' && (
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
              {['Active', 'Saved'].map(m => (
                <button key={m} onClick={() => { setModeTab(m); setExpandedId(null); }}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${modeTab === m ? (m === 'Active' ? 'bg-primary text-white shadow-sm' : 'bg-white text-on-surface shadow-sm') : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {m === 'Active'
                    ? <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${modeTab === 'Active' ? 'bg-green-300' : 'bg-outline-variant'}`} />
                    : <span className="material-symbols-outlined text-[14px]">bookmark</span>}
                  {m}
                </button>
              ))}
            </div>
            {/* Events Active: prompt to deploy instead of create */}
            {typeTab === 'Events' && modeTab === 'Active' && (
              <button onClick={() => setModeTab('Saved')} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
                <span className="material-symbols-outlined text-[14px]">rocket_launch</span> Deploy from Templates
              </button>
            )}
          </div>
        )}
        {typeTab === 'Tasks' && (
          <div className="flex bg-surface-container p-1 rounded-xl gap-0.5 w-fit">
            {['Active', 'Recurring'].map(m => (
              <button key={m} onClick={() => { setModeTab(m); setExpandedId(null); }}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${modeTab === m ? (m === 'Active' ? 'bg-primary text-white shadow-sm' : 'bg-white text-on-surface shadow-sm') : 'text-on-surface-variant hover:text-on-surface'}`}>
                {m === 'Active'
                  ? <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${modeTab === 'Active' ? 'bg-green-300' : 'bg-outline-variant'}`} />
                  : <span className="material-symbols-outlined text-[14px]">autorenew</span>}
                {m}
                {m === 'Recurring' && recurringTemplates.length > 0 && (
                  <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{recurringTemplates.length}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Projects Active ── */}
      {typeTab === 'Projects' && modeTab === 'Active' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeContainers.length === 0 ? (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>folder_open</span>
              <p className="font-bold text-on-surface-variant">No active projects.</p>
            </div>
          ) : activeContainers.map(c => <ActiveCard key={c.id} c={c} />)}
        </div>
      )}

      {/* ── Events Active ── */}
      {typeTab === 'Events' && modeTab === 'Active' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeContainers.length === 0 ? (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
              <p className="font-bold text-on-surface-variant">No active events.</p>
              <button className="mt-3 text-sm text-primary font-bold hover:underline" onClick={() => setModeTab('Saved')}>Deploy from Saved Templates →</button>
            </div>
          ) : activeContainers.map(c => <ActiveCard key={c.id} c={c} />)}
        </div>
      )}

      {/* ── Tasks Active ── */}
      {typeTab === 'Tasks' && modeTab === 'Active' && <TasksActive />}

      {/* ── Tasks Recurring ── */}
      {typeTab === 'Tasks' && modeTab === 'Recurring' && <RecurringSection />}

      {/* ── Saved templates ── */}
      {typeTab !== 'Tasks' && modeTab === 'Saved' && <SavedPanel />}

      {/* ── Modals ── */}
      {isCreateOpen && (
        <Modal title={typeTab === 'Events' ? 'New Event Template' : 'New Project'} onClose={() => { setIsCreateOpen(false); setNewTitle(''); }}>
          <input autoFocus className={inputCls} placeholder={typeTab === 'Events' ? 'Template name…' : 'Project name…'}
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitCreate(typeTab === 'Events')} />
          {typeTab === 'Events' ? (
            <button onClick={() => submitCreate(true)} disabled={submitting || !newTitle.trim()} className={btnPrimary}>{submitting ? 'Saving…' : 'Save Template'}</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => submitCreate(false)} disabled={submitting || !newTitle.trim()} className={`${btnPrimary} flex-1`}>{submitting ? '…' : 'Create Project'}</button>
              <button onClick={() => submitCreate(true)}  disabled={submitting || !newTitle.trim()} className={`${btnSecondary} flex-1`}>Save as Template</button>
            </div>
          )}
        </Modal>
      )}
      {milestoneTarget && (
        <Modal title="Add Milestone" onClose={() => setMilestoneTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Milestone title…" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
            <input type="date" className={inputCls} value={milestoneForm.date} onChange={e => setMilestoneForm(f => ({ ...f, date: e.target.value }))} />
            <button onClick={submitMilestone} disabled={submitting || !milestoneForm.title.trim()} className={btnPrimary}>{submitting ? 'Adding…' : 'Add Milestone'}</button>
          </div>
        </Modal>
      )}
      {phaseTarget && (
        <Modal title="Add Phase" onClose={() => setPhaseTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Phase name…" value={phaseForm.title} onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))} />
            <input type="date" className={inputCls} value={phaseForm.date} onChange={e => setPhaseForm(f => ({ ...f, date: e.target.value }))} />
            <button onClick={submitPhase} disabled={submitting || !phaseForm.title.trim()} className={btnPrimary}>{submitting ? 'Adding…' : 'Add Phase'}</button>
          </div>
        </Modal>
      )}
      {checklistTarget && (
        <Modal title="Add Checklist Item" onClose={() => setChecklistTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Item title…" value={checklistForm.title} onChange={e => setChecklistForm(f => ({ ...f, title: e.target.value }))} />
            <select className={inputCls} value={checklistForm.assignee_id} onChange={e => setChecklistForm(f => ({ ...f, assignee_id: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {filteredProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" className={inputCls} value={checklistForm.date || checklistTarget.phaseDate || ''} onChange={e => setChecklistForm(f => ({ ...f, date: e.target.value }))} />
            <button onClick={submitChecklist} disabled={submitting || !checklistForm.title.trim()} className={btnPrimary}>{submitting ? 'Adding…' : 'Add Item'}</button>
          </div>
        </Modal>
      )}
      {deactivateTarget && (
        <Modal title="Deactivate Project?" onClose={() => setDeactivateTarget(null)}>
          <p className="text-sm text-on-surface-variant">"{cName(deactivateTarget)}" will be removed from active views.</p>
          <div className="flex flex-col gap-2">
            {deactivateTarget.type === 'Project' && !deactivateTarget.source_template_id && (
              <button onClick={() => doDeactivate(deactivateTarget, true)} className={btnPrimary}>
                <span className="flex items-center gap-1.5 justify-center"><span className="material-symbols-outlined text-[16px]">bookmark_add</span> Save as Template & Deactivate</span>
              </button>
            )}
            <button onClick={() => doDeactivate(deactivateTarget, false)} className="w-full bg-error/10 text-error border border-error/20 px-4 py-2 rounded-xl text-sm font-bold hover:bg-error/20">Deactivate Without Saving</button>
            <button onClick={() => setDeactivateTarget(null)} className={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
      {editingItem && (
        <EditItemModal item={editingItem} profiles={safeProfiles} onClose={() => setEditingItem(null)} onSave={updateWorkItem} />
      )}

      {/* FAB: Projects (create) + Events Saved (create template) */}
      {(typeTab === 'Projects' || (typeTab === 'Events' && modeTab === 'Saved')) &&
       !(currentUser?.role === 'Assignee') && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setIsCreateOpen(true)}
            className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-[28px]">add</span>
          </button>
        </div>
      )}
    </div>
  );
}
