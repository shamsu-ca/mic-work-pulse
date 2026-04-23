import { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getActionableUnits } from '../lib/statusUtils';

const PRIORITY_COLOR = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-blue-100 text-blue-700',
  Low:      'bg-surface-container text-on-surface-variant',
};
const getPriorityColor = (p) => PRIORITY_COLOR[p] ?? PRIORITY_COLOR.Low;

const getAvatarInitials = (name) => {
  if (!name) return 'U';
  const split = name.split(' ');
  return split.length > 1 ? (split[0][0] + split[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

// ─── Quick Allocation form ─────────────────────────────────────────────────────
function QuickAllocation({ selectedIds, allProfiles, currentUser, allocationDate, setAllocationDate, allocationEstMins, setAllocationEstMins, onAllocate, onRowAllocate }) {
  const isAssignee  = currentUser?.role === 'Assignee';
  const [assigneeId, setAssigneeId] = useState(isAssignee ? currentUser.id : '');

  const assignableProfiles = allProfiles.filter(p => p.role !== 'Admin');
  const canGo = selectedIds.length > 0 && (isAssignee || assigneeId) && allocationDate;

  const handleGo = () => {
    onAllocate(isAssignee ? currentUser.id : assigneeId);
  };

  // expose setter upward for row-level assign
  if (onRowAllocate) onRowAllocate.setCurrent = (id) => setAssigneeId(id);

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${selectedIds.length > 0 ? 'border-primary shadow-md shadow-primary/10' : 'border-outline-variant/30'}`}>
      <div className={`px-5 py-4 border-b border-surface-container-high flex items-center gap-3 transition-colors ${selectedIds.length > 0 ? 'bg-primary/5' : 'bg-surface-container-lowest'}`}>
        <span className="material-symbols-outlined text-[20px] text-primary">person_add</span>
        <h2 className="font-bold text-base font-headline text-on-surface">Quick Allocation</h2>
        {selectedIds.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-sm font-bold text-primary">
            <span className="w-6 h-6 bg-primary text-white rounded flex items-center justify-center text-xs font-black">{selectedIds.length}</span>
            selected
          </span>
        )}
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Assign To — hidden for assignees (auto-assigns to self) */}
        {!isAssignee && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Assign To Staff</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">person</span>
              <select
                className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="">Select assignee…</option>
                {assignableProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.position ? ` · ${p.position}` : ''}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">expand_more</span>
            </div>
          </div>
        )}

        {/* Target Date */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Target Date</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">calendar_month</span>
            <input
              type="date"
              className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
              value={allocationDate}
              onChange={e => setAllocationDate(e.target.value)}
            />
          </div>
        </div>

        {/* Est. Time — total, divided by selected count */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">
            Est. Time (mins total)
            {selectedIds.length > 1 && (
              <span className="ml-1 text-primary font-bold">÷ {selectedIds.length} = {allocationEstMins ? Math.round(Number(allocationEstMins) / selectedIds.length) : '?'} each</span>
            )}
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">timer</span>
            <input
              type="number" min="0" placeholder="e.g. 90"
              className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
              value={allocationEstMins}
              onChange={e => setAllocationEstMins(e.target.value)}
            />
          </div>
        </div>

        {/* Go button */}
        <div className="flex flex-col justify-end">
          <button
            className={`py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex justify-center items-center gap-2 ${
              canGo ? 'bg-primary text-white hover:opacity-90 active:scale-95' : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
            }`}
            onClick={handleGo}
            disabled={!canGo}
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {isAssignee ? 'Assign to Me' : "Let's Go"}
          </button>
        </div>
      </div>
    </div>
  );
}

const todayStr = () => new Date().toISOString().split('T')[0];

const formatAnnDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatAnnTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const annStatus = (ann) => {
  const today = todayStr();
  if (today > ann.event_date) return 'expired';
  const dayBefore = new Date(ann.event_date + 'T00:00:00');
  dayBefore.setDate(dayBefore.getDate() - 1);
  return today >= dayBefore.toISOString().split('T')[0] ? 'active' : 'upcoming';
};

// ─── Notifications management panel (admin only) ───────────────────────────────
function NotificationsPanel({ announcements, addAnnouncement, deleteAnnouncement }) {
  const empty = { title: '', message: '', event_date: '', event_time: '', staff_group: 'Both' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const cls = "border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full bg-white";
  const canSave = form.title.trim() && form.event_date;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await addAnnouncement({ ...form });
    setSaving(false);
    setForm(empty);
  };

  const sorted = [...announcements].sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-primary/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-container-high bg-primary/5 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
        <h2 className="font-bold text-base font-headline text-on-surface">Manage Notifications</h2>
        <span className="ml-auto text-xs text-on-surface-variant">{announcements.length} total</span>
      </div>

      {/* Create form */}
      <div className="p-5 border-b border-surface-container-high bg-surface-container-lowest/60">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Create New Notice</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <input className={cls} placeholder="Title — e.g. Staff Meeting on Friday" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <textarea className={cls + ' resize-none'} rows={2} placeholder="Message body (details, venue, requirements…)" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Event Date *</label>
            <input type="date" className={cls} value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Time (optional)</label>
            <input type="time" className={cls} value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Audience</label>
            <select className={cls} value={form.staff_group} onChange={e => setForm(f => ({ ...f, staff_group: e.target.value }))}>
              <option value="Both">All Staff (Both)</option>
              <option value="Office Staff">Office Staff only</option>
              <option value="Institution">Institution only</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all">
            <span className="material-symbols-outlined text-[16px]">send</span>{saving ? 'Publishing…' : 'Publish Notice'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-surface-container-low">
        {sorted.length === 0 && <p className="px-5 py-10 text-center text-on-surface-variant italic text-sm">No notifications published yet.</p>}
        {sorted.map(ann => {
          const st = annStatus(ann);
          const statusLabel = st === 'active' ? { txt: 'Active', cls: 'bg-green-100 text-green-700' } : st === 'upcoming' ? { txt: 'Upcoming', cls: 'bg-blue-100 text-blue-700' } : { txt: 'Expired', cls: 'bg-surface-container text-on-surface-variant' };
          return (
            <div key={ann.id} className={`flex items-start gap-4 px-5 py-4 group transition-colors hover:bg-surface-container-low/30 ${st === 'expired' ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-sm text-on-surface">{ann.title}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${statusLabel.cls}`}>{statusLabel.txt}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ann.staff_group === 'Both' ? 'bg-purple-100 text-purple-700' : ann.staff_group === 'Institution' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {ann.staff_group === 'Both' ? 'All Staff' : ann.staff_group}
                  </span>
                </div>
                {ann.message && <p className="text-xs text-on-surface-variant line-clamp-1">{ann.message}</p>}
                <p className="text-[10px] text-on-surface-variant mt-1">
                  {formatAnnDate(ann.event_date)}{ann.event_time ? ` · ${formatAnnTime(ann.event_time)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {confirmDel === ann.id ? (
                  <>
                    <button onClick={() => { deleteAnnouncement(ann.id); setConfirmDel(null); }} className="text-[10px] font-bold bg-error text-white px-2.5 py-1 rounded-lg">Delete</button>
                    <button onClick={() => setConfirmDel(null)} className="text-[10px] font-bold bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-lg">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDel(ann.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { workItems, profiles, currentUser, updateWorkItem, announcements, addAnnouncement, deleteAnnouncement } = useDataContext();
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [allocationDate, setAllocationDate]   = useState('');
  const [allocationEstMins, setAllocationEstMins] = useState('');
  const [showNotifPanel, setShowNotifPanel]   = useState(false);

  // Manager self/assistant toggle
  const isManagerOrAdmin = currentUser?.role === 'Manager' || currentUser?.role === 'Admin';
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'mine' | 'assistants'

  const safeProfiles  = profiles  || [];
  const safeWorkItems = workItems || [];

  // Assistants of current user (profiles whose manager === current user's name)
  const myAssistants = safeProfiles.filter(p => p.manager === currentUser?.name);

  // Planning pool — unassigned standard tasks in pool
  const planningPoolRaw = safeWorkItems.filter(w => w.in_planning_pool && !w.is_recurring);
  const planningPool    = getActionableUnits(planningPoolRaw);

  const toggleTask = (id) => setSelectedTaskIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const handleAllocate = async (assigneeId) => {
    if (selectedTaskIds.length === 0 || !assigneeId || !allocationDate) return;
    const perItemMins = allocationEstMins
      ? Math.round(Number(allocationEstMins) / selectedTaskIds.length)
      : null;

    for (const taskId of selectedTaskIds) {
      await updateWorkItem(taskId, {
        assignee_id:      assigneeId,
        expected_date:    allocationDate,
        in_planning_pool: false,
        status:           'Assigned',
        ...(perItemMins ? { estimated_hours: perItemMins / 60 } : {}),
      });
    }
    setSelectedTaskIds([]);
    setAllocationDate('');
    setAllocationEstMins('');
  };

  // Per-row assign: immediately allocates single task with form settings
  const handleRowAssign = async (taskId, assigneeId) => {
    if (!allocationDate && !assigneeId) return;
    const resolvedAssignee = assigneeId || (currentUser?.role === 'Assignee' ? currentUser.id : null);
    if (!resolvedAssignee) {
      // Select the task and show form instead
      setSelectedTaskIds(prev => prev.includes(taskId) ? prev : [...prev, taskId]);
      return;
    }
    const perItemMins = allocationEstMins ? Math.round(Number(allocationEstMins)) : null;
    await updateWorkItem(taskId, {
      assignee_id:      resolvedAssignee,
      expected_date:    allocationDate || new Date().toISOString().split('T')[0],
      in_planning_pool: false,
      status:           'Assigned',
      ...(perItemMins ? { estimated_hours: perItemMins / 60 } : {}),
    });
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Planning</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Allocate tasks and publish staff notices</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Notifications toggle (admin only) */}
          {currentUser?.role === 'Admin' && (
            <button onClick={() => setShowNotifPanel(v => !v)}
              className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all ${showNotifPanel ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface border-outline-variant/40 hover:bg-surface-container'}`}>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: showNotifPanel ? "'FILL' 1" : "'FILL' 0" }}>campaign</span>
              Notifications
              {announcements?.length > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${showNotifPanel ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>{announcements.length}</span>}
            </button>
          )}
          {/* Self / Assistants toggle for managers */}
          {isManagerOrAdmin && myAssistants.length > 0 && (
            <div className="flex bg-surface-container rounded-xl p-1 gap-0.5">
              <button onClick={() => setViewMode('all')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'all' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
                All
              </button>
              <button onClick={() => setViewMode('mine')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'mine' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
                Self
              </button>
              <button onClick={() => setViewMode('assistants')} className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'assistants' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
                Assistants
                {myAssistants.length > 1 && (
                  <span className="text-[10px] bg-surface-container-high px-1.5 rounded-full">{myAssistants.length}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Allocation at top ─────────────────────────────────────── */}
      <QuickAllocation
        selectedIds={selectedTaskIds}
        allProfiles={safeProfiles}
        currentUser={currentUser}
        allocationDate={allocationDate}
        setAllocationDate={setAllocationDate}
        allocationEstMins={allocationEstMins}
        setAllocationEstMins={setAllocationEstMins}
        onAllocate={handleAllocate}
      />

      {/* ── Pool Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-lowest">
          <h2 className="font-bold text-base font-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">inbox</span>
            Items Pending Allocation
          </h2>
          <div className="flex items-center gap-2">
            {selectedTaskIds.length > 0 && (
              <button onClick={() => setSelectedTaskIds([])} className="text-xs font-bold text-on-surface-variant hover:text-error px-2 py-1">
                Clear selection
              </button>
            )}
            <span className="bg-surface-container text-on-surface text-xs font-bold px-2 py-1 rounded">{planningPool.length} items</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
              <tr>
                <th className="px-5 py-3 w-10"></th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3 text-center">Priority</th>
                <th className="px-5 py-3 text-center">Age</th>
                <th className="px-5 py-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-sm font-medium">
              {planningPool.map(w => {
                const isSelected = selectedTaskIds.includes(w.id);
                return (
                  <tr
                    key={w.id}
                    className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-low/50'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-3 cursor-pointer" onClick={() => toggleTask(w.id)}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant bg-white'}`}>
                        {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                      </div>
                    </td>
                    {/* Subject */}
                    <td className="px-5 py-3 cursor-pointer" onClick={() => toggleTask(w.id)}>
                      <p className="font-semibold text-on-surface">{w.title}</p>
                      {w.description && <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{w.description}</p>}
                    </td>
                    {/* Priority */}
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityColor(w.priority)}`}>
                        {w.priority || 'Normal'}
                      </span>
                    </td>
                    {/* Age */}
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${w.aging === 'Aged' ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                        {w.aging || 'New'}
                      </span>
                    </td>
                    {/* Row-level assign button */}
                    <td className="px-5 py-3 text-right pr-4">
                      <button
                        onClick={() => handleRowAssign(w.id, currentUser?.role === 'Assignee' ? currentUser.id : null)}
                        className="flex items-center gap-1 ml-auto text-xs font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all"
                        title={currentUser?.role === 'Assignee' ? 'Assign to me' : 'Assign (set date first)'}
                      >
                        <span className="material-symbols-outlined text-[14px]">assignment_ind</span>
                        Assign
                      </button>
                    </td>
                  </tr>
                );
              })}
              {planningPool.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2 block">done_all</span>
                    <p className="text-on-surface-variant font-medium">Pool is empty — everything is allocated.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assistants list (when viewMode = assistants) */}
      {viewMode === 'assistants' && myAssistants.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3">My Assistants</p>
          <div className="flex flex-wrap gap-3">
            {myAssistants.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                  {getAvatarInitials(a.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{a.name}</p>
                  {a.position && <p className="text-[10px] text-on-surface-variant">{a.position}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications management panel (admin only) */}
      {showNotifPanel && currentUser?.role === 'Admin' && (
        <NotificationsPanel
          announcements={announcements ?? []}
          addAnnouncement={addAnnouncement}
          deleteAnnouncement={deleteAnnouncement}
        />
      )}

    </div>
  );
}
