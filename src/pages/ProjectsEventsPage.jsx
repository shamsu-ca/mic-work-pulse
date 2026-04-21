import { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus } from '../lib/statusUtils';

// ─── tiny helpers ────────────────────────────────────────────────────────────

const cName = (c) => c?.title ?? 'Untitled';
const todayStr = () => new Date().toISOString().split('T')[0];
const isToday = (d) => d === todayStr();

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

const progressBar = (p) => (
  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-500 ${p >= 80 ? 'bg-green-500' : p >= 40 ? 'bg-primary' : 'bg-amber-400'}`}
      style={{ width: `${Math.max(0, Math.min(100, p ?? 0))}%` }}
    />
  </div>
);

function buildCounts(items) {
  const c = { assigned: 0, ongoing: 0, completed: 0, overdue: 0, notStarted: 0 };
  items.forEach(t => {
    const ds = getDisplayStatus(t);
    if (ds === 'Completed') c.completed++;
    else if (ds === 'Overdue') c.overdue++;
    else if (ds === 'Ongoing') c.ongoing++;
    else if (ds === 'Assigned') c.assigned++;
    else c.notStarted++;
  });
  return c;
}

const Chip = ({ label, value, cls }) => value > 0 ? (
  <div className="flex flex-col items-center min-w-[36px]">
    <span className={`text-sm font-black ${cls}`}>{value}</span>
    <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant leading-none mt-0.5">{label}</span>
  </div>
) : null;

// ─── mini modal wrapper ───────────────────────────────────────────────────────
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

const inputCls = "border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";
const btnPrimary = "bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40";
const btnSecondary = "bg-white border border-outline-variant/40 text-on-surface px-4 py-2 rounded-xl text-sm font-bold hover:bg-surface-container transition-colors";

// ─── main page ───────────────────────────────────────────────────────────────

export default function ProjectsEventsPage() {
  const {
    containers, workItems, profiles, currentUser, staffGroup,
    addContainer, updateContainer, addWorkItem, updateWorkItem, deleteWorkItem,
  } = useDataContext();

  const [typeTab, setTypeTab] = useState('Events');
  const [modeTab, setModeTab] = useState('Active');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTplId, setSelectedTplId] = useState(null);

  // create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // add milestone modal
  const [milestoneTarget, setMilestoneTarget] = useState(null); // containerId
  const [milestoneForm, setMilestoneForm] = useState({ title: '', date: '' });

  // add phase modal
  const [phaseTarget, setPhaseTarget] = useState(null); // containerId
  const [phaseForm, setPhaseForm] = useState({ title: '', date: '' });

  // add checklist modal
  const [checklistTarget, setChecklistTarget] = useState(null); // {phaseId, phaseDate}
  const [checklistForm, setChecklistForm] = useState({ title: '', assignee_id: '', date: '' });

  // edit name inline
  const [editNameId, setEditNameId] = useState(null);
  const [editNameVal, setEditNameVal] = useState('');

  // deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState(null); // container

  // deploy
  const [deploying, setDeploying] = useState(false);

  // FAB
  const [isFabOpen, setIsFabOpen] = useState(false);

  const safeContainers = containers ?? [];
  const safeWorkItems   = workItems   ?? [];
  const safeProfiles    = profiles    ?? [];
  const isAdmin = currentUser?.role === 'Admin';

  const getProfile = (id) => safeProfiles.find(p => p.id === id);
  const containerType = typeTab === 'Projects' ? 'Project' : 'Event';

  // ── filtering ──────────────────────────────────────────────────────────────
  const visibleContainers = safeContainers.filter(c => {
    if (c.type !== containerType) return false;
    if (c.is_active === false) return false; // deactivated
    if (currentUser?.role === 'Assignee') {
      return safeWorkItems.some(w => w.container_id === c.id && w.assignee_id === currentUser.id);
    }
    if (c.staff_group) return c.staff_group === staffGroup;
    const items = safeWorkItems.filter(w => w.container_id === c.id);
    if (!items.length) return true;
    return items.some(w => {
      const a = safeProfiles.find(p => p.id === w.assignee_id);
      return !a || a.staff_group === staffGroup;
    });
  });

  const activeContainers   = visibleContainers.filter(c => !c.is_template);
  const templateContainers = visibleContainers.filter(c =>  c.is_template);

  // ── work-item helpers ──────────────────────────────────────────────────────
  const getActionable = (cid) => safeWorkItems.filter(w =>
    w.container_id === cid && !w.in_planning_pool && w.type !== 'Phase');

  const getPhases = (cid) => safeWorkItems
    .filter(w => w.container_id === cid && w.type === 'Phase')
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

  const getPhaseItems = (phaseId) => safeWorkItems.filter(w => w.parent_id === phaseId);
  const getMilestones = (cid) => safeWorkItems.filter(w => w.container_id === cid && w.type === 'Milestone');

  // ── safe payload (strip unknown columns before migration) ──────────────────
  const mkContainer = (fields) => {
    const p = { title: fields.title, type: fields.type, created_by: currentUser.id };
    if (fields.is_template !== undefined) p.is_template = fields.is_template;
    if (fields.staff_group)               p.staff_group = fields.staff_group;
    if (fields.source_template_id)        p.source_template_id = fields.source_template_id;
    return p;
  };

  // ── create container ───────────────────────────────────────────────────────
  const submitCreate = async (asTemplate) => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    const { error } = await addContainer(mkContainer({
      title: newTitle.trim(), type: containerType,
      staff_group: staffGroup, is_template: asTemplate,
    }));
    setSubmitting(false);
    if (!error) { setIsCreateOpen(false); setNewTitle(''); setModeTab(asTemplate ? 'Saved' : 'Active'); }
  };

  // ── save active project as template ───────────────────────────────────────
  const saveAsTemplate = async (c) => {
    const { data: tpl, error } = await addContainer(mkContainer({
      title: cName(c), type: c.type, staff_group: staffGroup, is_template: true,
    }));
    if (error || !tpl?.length) return;
    const tplId = tpl[0].id;
    // Copy milestones/phases
    for (const m of getMilestones(c.id)) {
      await addWorkItem({ title: m.title, type: 'Milestone', container_id: tplId, status: 'Assigned', created_by: currentUser.id, expected_date: m.expected_date ?? null });
    }
    // link active container back to template
    await updateContainer(c.id, { source_template_id: tplId });
    setModeTab('Saved');
  };

  // ── deploy template ────────────────────────────────────────────────────────
  const deployTemplate = async (tpl) => {
    setDeploying(true);
    const { data: newCont, error } = await addContainer(mkContainer({
      title: cName(tpl), type: tpl.type,
      staff_group: staffGroup, is_template: false, source_template_id: tpl.id,
    }));
    if (error || !newCont?.length) { setDeploying(false); return; }
    const newId = newCont[0].id;

    if (tpl.type === 'Event') {
      for (const ph of getPhases(tpl.id)) {
        const { data: newPh } = await addWorkItem({
          title: ph.title, type: 'Phase', container_id: newId,
          status: 'Assigned', created_by: currentUser.id, expected_date: ph.expected_date ?? null,
        });
        for (const item of getPhaseItems(ph.id)) {
          await addWorkItem({
            title: item.title, type: 'Checklist', container_id: newId,
            parent_id: newPh?.[0]?.id ?? null, status: 'Assigned',
            assignee_id: item.assignee_id ?? null,
            created_by: currentUser.id, expected_date: ph.expected_date ?? null,
          });
        }
      }
    } else {
      for (const m of getMilestones(tpl.id)) {
        await addWorkItem({
          title: m.title, type: 'Milestone', container_id: newId,
          status: 'Assigned', created_by: currentUser.id, expected_date: m.expected_date ?? null,
        });
      }
    }
    setDeploying(false);
    setModeTab('Active');
  };

  // ── add milestone ──────────────────────────────────────────────────────────
  const submitMilestone = async () => {
    if (!milestoneForm.title.trim() || !milestoneTarget) return;
    setSubmitting(true);
    await addWorkItem({
      title: milestoneForm.title.trim(), type: 'Milestone',
      container_id: milestoneTarget, status: 'Assigned',
      created_by: currentUser.id,
      expected_date: milestoneForm.date || null,
    });
    setSubmitting(false);
    setMilestoneTarget(null);
    setMilestoneForm({ title: '', date: '' });
  };

  // ── add phase ──────────────────────────────────────────────────────────────
  const submitPhase = async () => {
    if (!phaseForm.title.trim() || !phaseTarget) return;
    setSubmitting(true);
    await addWorkItem({
      title: phaseForm.title.trim(), type: 'Phase',
      container_id: phaseTarget, status: 'Assigned',
      created_by: currentUser.id,
      expected_date: phaseForm.date || null,
    });
    setSubmitting(false);
    setPhaseTarget(null);
    setPhaseForm({ title: '', date: '' });
  };

  // ── add checklist item ─────────────────────────────────────────────────────
  const submitChecklist = async () => {
    if (!checklistForm.title.trim() || !checklistTarget) return;
    setSubmitting(true);
    const c = safeContainers.find(x => safeWorkItems.find(w => w.id === checklistTarget.phaseId)?.container_id === x.id);
    const containerId = safeWorkItems.find(w => w.id === checklistTarget.phaseId)?.container_id;
    await addWorkItem({
      title: checklistForm.title.trim(), type: 'Checklist',
      container_id: containerId,
      parent_id: checklistTarget.phaseId,
      status: 'Assigned',
      assignee_id: checklistForm.assignee_id || null,
      created_by: currentUser.id,
      expected_date: checklistForm.date || checklistTarget.phaseDate || null,
    });
    setSubmitting(false);
    setChecklistTarget(null);
    setChecklistForm({ title: '', assignee_id: '', date: '' });
  };

  // ── edit name ──────────────────────────────────────────────────────────────
  const commitEditName = async () => {
    if (!editNameVal.trim() || !editNameId) return;
    await updateContainer(editNameId, { title: editNameVal.trim() });
    setEditNameId(null);
  };

  // ── deactivate ─────────────────────────────────────────────────────────────
  const doDeactivate = async (c, saveFirst) => {
    if (saveFirst) await saveAsTemplate(c);
    await updateContainer(c.id, { is_active: false });
    setDeactivateTarget(null);
    setExpandedId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const selectedTpl = templateContainers.find(c => c.id === selectedTplId) ?? templateContainers[0];

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto pb-24 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Projects & Events</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">{staffGroup} · {typeTab}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <StaffToggle />

        <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
          {['Projects', 'Events'].map(t => (
            <button key={t}
              onClick={() => { setTypeTab(t); setExpandedId(null); setSelectedTplId(null); }}
              className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${typeTab === t ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {t === 'Projects' ? 'folder_open' : 'event'}
              </span>
              {t}
            </button>
          ))}
        </div>

        <div className="flex border border-outline-variant/40 rounded-xl overflow-hidden bg-white">
          {['Active', 'Saved'].map(m => (
            <button key={m}
              onClick={() => { setModeTab(m); setExpandedId(null); }}
              className={`px-5 py-2 text-sm font-bold flex items-center gap-2 transition-colors border-r last:border-r-0 border-outline-variant/40
                ${modeTab === m
                  ? m === 'Active' ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              {m === 'Active'
                ? <span className={`w-2 h-2 rounded-full ${modeTab === 'Active' ? 'bg-green-300' : 'bg-outline-variant'}`} />
                : <span className="material-symbols-outlined text-[14px]">bookmark</span>
              }
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ ACTIVE ═══════════════════════════════════════════════════════════ */}
      {modeTab === 'Active' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeContainers.length === 0 && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>
                {containerType === 'Project' ? 'folder_open' : 'event'}
              </span>
              <p className="font-bold text-on-surface-variant">No active {typeTab.toLowerCase()}.</p>
              {containerType === 'Event' && (
                <button className="mt-3 text-sm text-primary font-bold hover:underline" onClick={() => setModeTab('Saved')}>
                  Deploy from Saved Templates →
                </button>
              )}
            </div>
          )}
          {activeContainers.map(c => <ActiveCard key={c.id} c={c} />)}
        </div>
      )}

      {/* ═══ SAVED ════════════════════════════════════════════════════════════ */}
      {modeTab === 'Saved' && <SavedPanel />}

      {/* ═══ MODALS ═══════════════════════════════════════════════════════════ */}

      {/* Create container */}
      {isCreateOpen && (
        <Modal title={typeTab === 'Events' ? 'New Event Template' : 'New Project'} onClose={() => { setIsCreateOpen(false); setNewTitle(''); }}>
          <input autoFocus className={inputCls} placeholder={typeTab === 'Events' ? 'Template name…' : 'Project name…'}
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (typeTab === 'Events' ? submitCreate(true) : submitCreate(false))}
          />
          {typeTab === 'Events' ? (
            <button onClick={() => submitCreate(true)} disabled={submitting || !newTitle.trim()} className={btnPrimary}>
              {submitting ? 'Saving…' : 'Save Template'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => submitCreate(false)} disabled={submitting || !newTitle.trim()} className={`${btnPrimary} flex-1`}>
                {submitting ? '…' : 'Create Active'}
              </button>
              <button onClick={() => submitCreate(true)} disabled={submitting || !newTitle.trim()} className={`${btnSecondary} flex-1`}>
                Save as Template
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Add milestone */}
      {milestoneTarget && (
        <Modal title="Add Milestone" onClose={() => setMilestoneTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Milestone title…"
              value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
            {!safeContainers.find(c => c.id === milestoneTarget)?.is_template ? (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">Expected Date</label>
                <input type="date" className={inputCls} value={milestoneForm.date}
                  onChange={e => setMilestoneForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant italic">Deadlines are set when this template is deployed as an active project.</p>
            )}
            <button onClick={submitMilestone} disabled={submitting || !milestoneForm.title.trim()} className={btnPrimary}>
              {submitting ? 'Adding…' : 'Add Milestone'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add phase */}
      {phaseTarget && (
        <Modal title="Add Phase" onClose={() => setPhaseTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Phase name (e.g. Pre-Planning)…"
              value={phaseForm.title} onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))} />
            {!safeContainers.find(c => c.id === phaseTarget)?.is_template ? (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
                  Phase Deadline <span className="text-on-surface-variant/60 normal-case">(assignees see this day's checklists)</span>
                </label>
                <input type="date" className={inputCls} value={phaseForm.date}
                  onChange={e => setPhaseForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant italic">Deadlines are assigned when this template is deployed as an active event.</p>
            )}
            <button onClick={submitPhase} disabled={submitting || !phaseForm.title.trim()} className={btnPrimary}>
              {submitting ? 'Adding…' : 'Add Phase'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add checklist item */}
      {checklistTarget && (
        <Modal title="Add Checklist Item" onClose={() => setChecklistTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Checklist item title…"
              value={checklistForm.title} onChange={e => setChecklistForm(f => ({ ...f, title: e.target.value }))} />
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">Assignee</label>
              <select className={inputCls} value={checklistForm.assignee_id}
                onChange={e => setChecklistForm(f => ({ ...f, assignee_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {safeProfiles.filter(p => p.role !== 'Admin').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
                Expected Date <span className="text-on-surface-variant/60 normal-case">(defaults to phase date)</span>
              </label>
              <input type="date" className={inputCls}
                value={checklistForm.date || checklistTarget.phaseDate || ''}
                onChange={e => setChecklistForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <button onClick={submitChecklist} disabled={submitting || !checklistForm.title.trim()} className={btnPrimary}>
              {submitting ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </Modal>
      )}

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <Modal title="Deactivate?" onClose={() => setDeactivateTarget(null)}>
          <p className="text-sm text-on-surface-variant">
            {deactivateTarget.type === 'Event'
              ? `"${cName(deactivateTarget)}" will be hidden from all active views.`
              : deactivateTarget.source_template_id
                ? `"${cName(deactivateTarget)}" will be hidden from all active views.`
                : `"${cName(deactivateTarget)}" has no saved template. Save it before deactivating?`}
          </p>
          <div className="flex flex-col gap-2">
            {deactivateTarget.type === 'Project' && !deactivateTarget.source_template_id && (
              <button onClick={() => doDeactivate(deactivateTarget, true)} className={btnPrimary}>
                Save & Deactivate
              </button>
            )}
            <button
              onClick={() => doDeactivate(deactivateTarget, false)}
              className="w-full bg-error/10 text-error border border-error/20 px-4 py-2 rounded-xl text-sm font-bold hover:bg-error/20 transition-colors"
            >
              {deactivateTarget.type === 'Project' && !deactivateTarget.source_template_id ? 'Deactivate Anyway' : 'Deactivate'}
            </button>
            <button onClick={() => setDeactivateTarget(null)} className={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {isFabOpen && (
          <div className="flex flex-col gap-2 items-end">
            {typeTab === 'Projects' && (
              <FabOpt icon="folder_open" label="New Project" color="text-indigo-600"
                onClick={() => { setIsFabOpen(false); setIsCreateOpen(true); }} />
            )}
            {typeTab === 'Events' && (
              <FabOpt icon="event" label="New Event Template" color="text-emerald-600"
                onClick={() => { setIsFabOpen(false); setIsCreateOpen(true); setModeTab('Saved'); }} />
            )}
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(v => !v)}
          className={`w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-all duration-200 ${isFabOpen ? 'rotate-45' : ''}`}
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // INNER COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────

  function StaffToggle() {
    const ctx = useDataContext();
    if (currentUser?.role !== 'Admin') return null;
    return (
      <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
        {['Office Staff', 'Institution'].map(g => (
          <button key={g} onClick={() => ctx.setStaffGroup(g)}
            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${ctx.staffGroup === g ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {g}
          </button>
        ))}
      </div>
    );
  }

  function FabOpt({ icon, label, color, onClick }) {
    return (
      <button onClick={onClick}
        className="flex items-center gap-2 bg-white border border-outline-variant/40 shadow-md rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
        <span className={`material-symbols-outlined text-[18px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        {label}
      </button>
    );
  }

  function ActiveCard({ c }) {
    const isExpanded = expandedId === c.id;
    const isProject = c.type === 'Project';
    const progress = c.progress ?? 0;
    const allItems = getActionable(c.id);
    const counts = buildCounts(allItems);
    const isFromTemplate = !!c.source_template_id;

    const isEditingName = editNameId === c.id;

    return (
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${isExpanded ? 'border-primary/40' : 'border-outline-variant/30'}`}>
        {/* card header */}
        <div className="p-5 cursor-pointer hover:bg-surface-container-low/30 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : c.id)}>
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
                  {isFromTemplate && (
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">From Template</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-lg font-black text-on-surface leading-none">{progress}%</p>
                <p className="text-[10px] text-on-surface-variant">Done</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </div>
          </div>
          <div className="mt-3">{progressBar(progress)}</div>
          {allItems.length > 0 && (
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <Chip label="Done" value={counts.completed} cls="text-green-600" />
              <Chip label="Ongoing" value={counts.ongoing} cls="text-blue-600" />
              <Chip label="Overdue" value={counts.overdue} cls="text-red-600" />
              <Chip label="Assigned" value={counts.assigned} cls="text-on-surface" />
              <Chip label="Pending" value={counts.notStarted} cls="text-amber-600" />
            </div>
          )}
        </div>

        {/* expanded body */}
        {isExpanded && (
          <div className="border-t border-surface-container-high">
            {/* name edit row */}
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
                  <button onClick={() => setModeTab('Saved')}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit in Saved Templates
                  </button>
                ) : (
                  <button onClick={() => { setEditNameId(c.id); setEditNameVal(cName(c)); }}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit Name
                  </button>
                )}
              </div>
            )}

            {/* project: milestones */}
            {isProject && (
              <div className="px-5 py-4 flex flex-col gap-2 max-h-72 overflow-y-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Milestones</p>
                {getMilestones(c.id).map(m => {
                  const ds = getDisplayStatus(m);
                  const badgeCls = ds === 'Completed' ? 'bg-green-100 text-green-700' : ds === 'Overdue' ? 'bg-red-100 text-red-700' : ds === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant';
                  return (
                    <div key={m.id} className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-surface-container-low/40 group transition-colors">
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${ds === 'Completed' ? 'border-green-500 bg-green-500' : 'border-outline-variant'}`}>
                        {ds === 'Completed' && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${ds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{m.title}</span>
                      {m.expected_date && <span className="text-[10px] text-on-surface-variant">{m.expected_date}</span>}
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeCls}`}>{ds}</span>
                      {isAdmin && (
                        <button onClick={() => deleteWorkItem(m.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  );
                })}
                {getMilestones(c.id).length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">No milestones yet.</p>
                )}
                {isAdmin && (
                  <button onClick={() => setMilestoneTarget(c.id)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Milestone
                  </button>
                )}
              </div>
            )}

            {/* event: phases + checklists */}
            {!isProject && (
              <div className="px-5 py-4 flex flex-col gap-4 max-h-96 overflow-y-auto">
                {getPhases(c.id).map((ph, i) => {
                  const phItems = getPhaseItems(ph.id);
                  const phToday = isToday(ph.expected_date);
                  return (
                    <div key={ph.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-xs font-black text-on-surface uppercase tracking-wide">{ph.title}</span>
                          {ph.expected_date && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${phToday ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                              {phToday ? '🔔 TODAY' : ph.expected_date}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => { setChecklistTarget({ phaseId: ph.id, phaseDate: ph.expected_date }); setChecklistForm({ title: '', assignee_id: '', date: '' }); }}
                                className="flex items-center gap-1 text-[11px] font-bold bg-primary text-white px-2.5 py-1 rounded-lg hover:opacity-90 transition-opacity">
                                <span className="material-symbols-outlined text-[13px]">add</span> Add
                              </button>
                              <button onClick={() => deleteWorkItem(ph.id)}
                                className="text-on-surface-variant hover:text-error transition-colors">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 pl-7">
                        {phItems.length === 0 && (
                          <p className="text-[11px] text-on-surface-variant italic">No items yet.</p>
                        )}
                        {phItems.map(item => {
                          const ds = getDisplayStatus(item);
                          const assignee = getProfile(item.assignee_id);
                          const badgeCls = ds === 'Completed' ? 'bg-green-100 text-green-700' : ds === 'Overdue' ? 'bg-red-100 text-red-700' : ds === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant';
                          return (
                            <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-surface-container-low/40 group transition-colors">
                              <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${ds === 'Completed' ? 'border-green-500 bg-green-500' : 'border-outline-variant'}`} />
                              <span className={`flex-1 text-sm font-medium truncate ${ds === 'Completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{item.title}</span>
                              {assignee && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary">
                                    {getInitials(assignee.name)}
                                  </div>
                                  <span className="text-[10px] text-on-surface-variant">{assignee.name.split(' ')[0]}</span>
                                </div>
                              )}
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${badgeCls}`}>{ds}</span>
                              {isAdmin && (
                                <button onClick={() => deleteWorkItem(item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error">
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {getPhases(c.id).length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">No phases yet.</p>
                )}
                {isAdmin && (
                  <button onClick={() => setPhaseTarget(c.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Phase
                  </button>
                )}
              </div>
            )}

            {/* footer actions */}
            {isAdmin && (
              <div className="px-5 py-3 border-t border-surface-container-low flex items-center gap-2 flex-wrap">
                {isProject && !isFromTemplate && (
                  <button onClick={() => saveAsTemplate(c)}
                    className="flex items-center gap-1.5 text-xs font-bold border border-outline-variant/40 bg-white text-on-surface px-3 py-1.5 rounded-xl hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[14px]">bookmark_add</span> Save Project
                  </button>
                )}
                <button onClick={() => setDeactivateTarget(c)}
                  className="flex items-center gap-1.5 text-xs font-bold text-error border border-error/20 bg-error/5 px-3 py-1.5 rounded-xl hover:bg-error/10 transition-colors ml-auto">
                  <span className="material-symbols-outlined text-[14px]">pause_circle</span> Deactivate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function SavedPanel() {
    if (templateContainers.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-3 block">library_books</span>
          <p className="font-bold text-on-surface-variant">No saved templates yet.</p>
        </div>
      );
    }

    const active = selectedTpl ?? templateContainers[0];
    const isProject = active?.type === 'Project';
    const phases = isProject ? [] : getPhases(active?.id);
    const milestones = getMilestones(active?.id);

    const isTplEditingName = editNameId === active?.id;

    return (
      <div className="flex gap-4 min-h-[520px]">
        {/* left list */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">
            Templates <span className="text-primary">{templateContainers.length}</span>
          </p>
          <div className="flex flex-col gap-2">
            {templateContainers.map(c => {
              const isSel = (selectedTplId ?? templateContainers[0]?.id) === c.id;
              return (
                <div key={c.id} onClick={() => setSelectedTplId(c.id)}
                  className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all ${isSel ? 'border-primary shadow-sm' : 'border-outline-variant/30 hover:border-primary/40'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-on-surface text-sm leading-tight">{cName(c)}</p>
                    {isSel && <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">check_circle</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={e => { e.stopPropagation(); deployTemplate(c); }} disabled={deploying}
                      className="flex-1 py-1.5 text-xs font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                      {deploying ? '…' : 'Deploy'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setSelectedTplId(c.id); }}
                      className="flex-1 py-1.5 text-xs font-bold border border-outline-variant/40 rounded-xl hover:bg-surface-container transition-colors text-on-surface">
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* right panel */}
        <div className="flex-1 bg-white rounded-2xl border border-outline-variant/30 overflow-hidden flex flex-col">
          {active ? (
            <>
              <div className="px-6 py-5 border-b border-surface-container-high">
                {/* editable name */}
                {isTplEditingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input autoFocus className="flex-1 border border-outline-variant/50 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={editNameVal} onChange={e => setEditNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditName(); if (e.key === 'Escape') setEditNameId(null); }} />
                    <button onClick={commitEditName} className="text-xs font-bold text-primary hover:underline">Save</button>
                    <button onClick={() => setEditNameId(null)} className="text-xs font-bold text-on-surface-variant hover:underline">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-extrabold text-on-surface">{cName(active)}</h2>
                    {isAdmin && (
                      <button onClick={() => { setEditNameId(active.id); setEditNameVal(cName(active)); }}
                        className="text-on-surface-variant hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 bg-surface-container rounded-xl px-4 py-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">checklist</span>
                    <div>
                      <p className="text-sm font-black text-on-surface">
                        {isProject ? milestones.length : phases.length}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {isProject ? 'Milestones' : 'Phases'}
                      </p>
                    </div>
                  </div>
                  {!isProject && (
                    <div className="flex items-center gap-2 bg-surface-container rounded-xl px-4 py-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">task_alt</span>
                      <div>
                        <p className="text-sm font-black text-on-surface">
                          {phases.reduce((s, ph) => s + getPhaseItems(ph.id).length, 0)}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Checklists</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* structure body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                {isProject ? (
                  <>
                    {milestones.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl group">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-on-surface">{m.title}</span>
                        {m.expected_date && <span className="text-[10px] text-on-surface-variant">{m.expected_date}</span>}
                        {isAdmin && (
                          <button onClick={() => deleteWorkItem(m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {milestones.length === 0 && <p className="text-sm text-on-surface-variant italic">No milestones yet.</p>}
                    {isAdmin && (
                      <button onClick={() => setMilestoneTarget(active.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Milestone
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {phases.map((ph, i) => {
                      const items = getPhaseItems(ph.id);
                      return (
                        <div key={ph.id}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-black flex items-center justify-center">
                                {i + 1}
                              </span>
                              <h3 className="text-sm font-black text-on-surface">{ph.title}</h3>
                              {ph.expected_date && (
                                <span className="text-[9px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{ph.expected_date}</span>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setChecklistTarget({ phaseId: ph.id, phaseDate: ph.expected_date }); setChecklistForm({ title: '', assignee_id: '', date: '' }); }}
                                  className="flex items-center gap-1 text-[11px] font-bold bg-primary text-white px-2.5 py-1 rounded-lg hover:opacity-90">
                                  <span className="material-symbols-outlined text-[13px]">add</span> Add Item
                                </button>
                                <button onClick={() => deleteWorkItem(ph.id)}
                                  className="text-on-surface-variant hover:text-error transition-colors">
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                            {items.map(item => (
                              <div key={item.id} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-3 group">
                                <span className="w-4 h-4 rounded-full border-2 border-outline-variant flex-shrink-0" />
                                <span className="flex-1 text-sm font-medium text-on-surface leading-tight">{item.title}</span>
                                {isAdmin && (
                                  <button onClick={() => deleteWorkItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error flex-shrink-0">
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                )}
                              </div>
                            ))}
                            {items.length === 0 && <p className="text-[11px] text-on-surface-variant italic">No items.</p>}
                          </div>
                        </div>
                      );
                    })}
                    {phases.length === 0 && <p className="text-sm text-on-surface-variant italic">No phases yet.</p>}
                    {isAdmin && (
                      <button onClick={() => setPhaseTarget(active.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Phase
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* footer */}
              <div className="px-6 py-4 border-t border-surface-container-high flex items-center justify-between">
                <button className="text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                  Duplicate Template
                </button>
                <button onClick={() => deployTemplate(active)} disabled={deploying}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity">
                  {deploying
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Deploying…</>
                    : <><span className="material-symbols-outlined text-[16px]">rocket_launch</span> {isProject ? 'Deploy Project' : 'Deploy Event'}</>
                  }
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
              Select a template.
            </div>
          )}
        </div>
      </div>
    );
  }
}
