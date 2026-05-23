import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, isPhaseActive } from '../lib/statusUtils';
import { fmtDate } from '../lib/dateUtils';
import { StaffToggle } from '../components/common/FilterBar';
import CompletionPanel from '../components/common/CompletionPanel';
import FollowUpModal from '../components/common/FollowUpModal';

function ActivityTimeline({ item, workItems, onViewDetail }) {
  const events = [];

  events.push({
    label: `${item.type || 'Task'} Created`,
    date: item.created_at,
    icon: 'add_circle',
    color: 'text-blue-500 bg-blue-100',
  });

  if (item.status === 'Ongoing' || item.status === 'Completed') {
    events.push({
      label: `${item.type || 'Task'} Started`,
      date: item.updated_at || item.created_at,
      icon: 'play_circle',
      color: 'text-indigo-500 bg-indigo-100',
    });
  }

  if (item.status === 'Completed' && item.completed_at) {
    events.push({
      label: `${item.type || 'Task'} Completed`,
      date: item.completed_at,
      icon: 'check_circle',
      color: 'text-green-500 bg-green-100',
    });
  }

  const followUps = (workItems || []).filter(w => w.linked_to === item.id);
  followUps.forEach(fu => {
    events.push({
      label: `Created Follow-up ${fu.title}`,
      date: fu.created_at,
      icon: 'subdirectory_arrow_right',
      color: 'text-purple-500 bg-purple-100',
      targetItem: fu,
    });
    if (fu.status === 'Completed' && fu.completed_at) {
      events.push({
        label: `Follow-up "${fu.title}" Completed`,
        date: fu.completed_at,
        icon: 'done_all',
        color: 'text-emerald-500 bg-emerald-100',
      });
    }
  });

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="flex flex-col gap-3 mt-2 pl-1">
      <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px]">history</span>Activity Timeline
      </span>
      <div className="relative border-l-2 border-outline-variant/40 ml-2 pl-4 flex flex-col gap-3">
        {events.map((ev, idx) => (
          <div key={idx} className="relative flex items-start gap-3">
            <div className={`absolute -left-[25px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${ev.color} flex-shrink-0 shadow-sm`}>
              <span className="material-symbols-outlined text-[9px] font-bold">{ev.icon}</span>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {ev.targetItem && onViewDetail ? (
                <button
                  type="button"
                  onClick={() => onViewDetail(ev.targetItem)}
                  className="text-xs font-bold text-indigo-600 hover:underline text-left block"
                >
                  {ev.label}
                </button>
              ) : (
                <p className="text-xs font-semibold text-on-surface leading-tight">{ev.label}</p>
              )}
              <p className="text-[9px] text-on-surface-variant font-medium mt-0.5">
                {new Date(ev.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpandedItemDetails({ item, workItems, profiles, currentUser, onFollowUp, onViewDetail }) {
  const sourceItem = item.linked_to ? (workItems || []).find(w => w.id === item.linked_to) : null;
  const followUps = (workItems || []).filter(w => w.linked_to === item.id);
  const { savedTasks } = useDataContext();
  const groupName = item.group_name || (item.parent_id ? (savedTasks || []).find(g => g.id === item.parent_id)?.title : null);

  return (
    <div className="px-5 py-4 flex flex-col gap-3 bg-slate-50/50 border-t border-b border-slate-100">
      {groupName && (
        <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 w-fit">
          <span className="material-symbols-outlined text-[14px]">folder</span>
          <span className="font-semibold">Group: {groupName}</span>
        </div>
      )}
      {sourceItem && (
        <div className="flex items-center gap-2 bg-indigo-50/30 border border-indigo-100 rounded-xl px-4 py-2 text-xs text-indigo-900">
          <span className="font-bold">Follow-up of:</span>
          <span>{sourceItem.title}</span>
        </div>
      )}

      {item.description && <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>}

      {followUps.length > 0 && (
        <div className="flex flex-col gap-1.5 bg-indigo-50/20 border border-indigo-100/30 rounded-xl p-3.5 mt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">list_alt</span>Follow-up Items
          </span>
          <div className="flex flex-col gap-2 pl-1 border-l-2 border-indigo-200/50">
            {followUps.map(fu => {
              const fuDs = getDisplayStatus(fu);
              const fuBadge = fuDs === 'Completed' ? 'bg-green-100 text-green-700' : fuDs === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-surface-container text-on-surface-variant';
              const fuAssignee = (profiles || []).find(p => p.id === fu.assignee_id)?.name || 'Unassigned';
              return (
                <div key={fu.id} className="flex items-center justify-between text-xs gap-3 hover:bg-white/80 p-1.5 rounded transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(fu); }}>
                  <span className="font-semibold text-indigo-900 hover:underline flex-1 truncate">{fu.title}</span>
                  <span className="text-[10px] text-on-surface-variant/80">{fuAssignee.split(' ')[0]}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${fuBadge}`}>{fuDs}</span>
                  <span className="text-[10px] text-on-surface-variant/60">{fu.expected_date ? fmtDate(fu.expected_date) : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <ActivityTimeline item={item} workItems={workItems} onViewDetail={onViewDetail} />

      {/* Create Follow-up Button */}
      {currentUser?.role === 'Admin' && (
        <button 
          onClick={(e) => { e.stopPropagation(); onFollowUp(item); }} 
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl self-start mt-2 shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span> Create Follow-up
        </button>
      )}
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

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
  if (rule.type === 'weekly' && Array.isArray(rule.weekly_days))
                                      return `Weekly (${rule.weekly_days.map(d => days[d]).join(', ')})`;
  if (rule.type === 'weekly')         return `Weekly (${days[rule.day] ?? 'Mon'})`;
  if (rule.type === 'monthly' && rule.monthly_day)
                                      return `Monthly (day ${rule.monthly_day})`;
  if (rule.type === 'monthly')        return `Monthly (day ${rule.date})`;
  if (rule.type === 'x_monthly')      return `Every ${rule.x_month_interval} months (day ${rule.monthly_day})`;
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

// Inline delete button
function DeleteBtn({ onDelete, size = 'sm' }) {
  return (
    <button onClick={onDelete}
      className={`text-on-surface-variant hover:text-error transition-colors ${size === 'xs' ? 'opacity-0 group-hover:opacity-100' : ''}`}>
      <span className="material-symbols-outlined text-[16px]">delete</span>
    </button>
  );
}

// Edit checklist/milestone item modal
function EditItemModal({ item, profiles, currentUser, onClose, onSave }) {
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
          {(profiles || []).filter(p => p.role !== 'Admin' || p.id === currentUser?.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
    savedContainers, savedTasks,
    addContainer, updateContainer, addWorkItem, updateWorkItem, deleteWorkItem,
    addSavedContainer, updateSavedContainer,
    addSavedTask, updateSavedTask, deleteSavedTask,
    completeWorkItem, createFollowUpTask,
    staffGroup,
  } = useDataContext();


  const [typeTab, setTypeTab]       = useState('Projects');
  const [modeTab, setModeTab]       = useState('Active');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTplId, setSelectedTplId] = useState(null);
  const [activeCardDetail, setActiveCardDetail] = useState(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen]       = useState(false);
  const [newTitle, setNewTitle]               = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [milestoneTarget, setMilestoneTarget] = useState(null);
  const [milestoneForm, setMilestoneForm]     = useState({ title: '', date: '', assignee_id: '' });
  const [phaseTarget, setPhaseTarget]         = useState(null);
  const [phaseForm, setPhaseForm]             = useState({ title: '', date: '' });
  const [checklistTarget, setChecklistTarget] = useState(null);
  const [checklistForm, setChecklistForm]     = useState({ title: '', assignee_id: '', date: '' });
  const [editNameId, setEditNameId]           = useState(null);
  const [editNameVal, setEditNameVal]         = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deploying, setDeploying]             = useState(false);
  const [deployError, setDeployError]         = useState(null);
  const [deployModalTpl, setDeployModalTpl]   = useState(null);
  const [deployPhaseDates, setDeployPhaseDates] = useState({});
  const [editingItem, setEditingItem]         = useState(null);
  const [pendingCompleteItem, setPendingCompleteItem] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [followUpTarget, setFollowUpTarget] = useState(null);

  const handleAddMilestoneClick = (projectId) => {
    const projectMilestones = safeSavedContainers.some(c => c.id === projectId)
      ? getSavedMilestones(projectId)
      : getMilestones(projectId);
    const sorted = [...projectMilestones].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const lastAssigneeId = sorted[0]?.assignee_id || '';
    setMilestoneForm({
      title: '',
      date: '',
      assignee_id: lastAssigneeId,
    });
    setMilestoneTarget(projectId);
  };

  const handleViewDetail = (item) => {
    if (!item) return;
    if (!item.container_id) {
      // Standalone task, nothing to expand in ProjectsEventsPage
      return;
    }
    const container = safeContainers.find(c => c.id === item.container_id);
    if (!container) return;
    setTypeTab(container.type === 'Project' ? 'Projects' : 'Events');
    setModeTab(container.is_active === false ? 'History' : 'Active');
    setExpandedId(container.id);
    setExpandedItemId(item.id);
  };

  const handleProjectClick = (projectId) => {
    setExpandedId(projectId);
    setTimeout(() => {
      document.getElementById(`container-card-${projectId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };


  const handleProjectComplete = async ({ note, tag, followUp }) => {
    if (!pendingCompleteItem) return;
    await completeWorkItem(pendingCompleteItem.id, { note, tag });
    if (followUp?.title?.trim() && followUp?.dueDate) {
      await createFollowUpTask(pendingCompleteItem.id, {
        title: followUp.title,
        description: followUp.description,
        dueDate: followUp.dueDate,
        assigneeId: followUp.assigneeId,
        priority: followUp.priority,
        linkType: 'Continuation',
        type: pendingCompleteItem.type || 'Task',
        container_id: pendingCompleteItem.container_id || null,
      });
    }
    setPendingCompleteItem(null);
  };

  const safeContainers      = containers      ?? [];
  const safeWorkItems       = workItems       ?? [];
  const safeProfiles        = profiles        ?? [];
  const safeSavedContainers = savedContainers ?? [];
  const safeSavedTasks      = savedTasks      ?? [];
  const isAdmin             = currentUser?.role === 'Admin';

  const canManageContainer = (containerId) => {
    if (isAdmin) return true;
    const c = safeContainers.find(con => con.id === containerId)
           ?? safeSavedContainers.find(con => con.id === containerId);
    return c?.created_by === currentUser?.id;
  };

  // Route update/delete to the right table based on which list the item lives in
  const savedTaskIdSet = new Set(safeSavedTasks.map(t => t.id));
  const updateAnyItem = (id, updates) =>
    savedTaskIdSet.has(id) ? updateSavedTask(id, updates) : updateWorkItem(id, updates);
  const deleteAnyItem = (id) =>
    savedTaskIdSet.has(id) ? deleteSavedTask(id) : deleteWorkItem(id);
  const filteredProfiles = safeProfiles.filter(p =>
    (p.role !== 'Admin' && (p.category || 'Office Staff') === staffGroup) || p.id === currentUser?.id
  );
  const milestoneAssigneeOptions = isAdmin
    ? filteredProfiles
    : safeProfiles.filter(p => p.id === currentUser?.id || p.manager === currentUser?.name);

  const getProfile    = (id) => safeProfiles.find(p => p.id === id);
  const containerType = typeTab === 'Projects' ? 'Project' : typeTab === 'Events' ? 'Event' : null;

  // ── Container filters ──────────────────────────────────────────────────────
  const activeContainers = safeContainers.filter(c => {
    if (c.type !== containerType)  return false;
    if (c.is_active === false)     return false;
    if (currentUser?.role !== 'Admin') {
      const isAllowed = c.created_by === currentUser.id ||
        safeWorkItems.some(w => w.container_id === c.id && w.assignee_id === currentUser.id);
      if (!isAllowed) return false;
    }
    if (filterAssigneeId) {
      const hasItem = safeWorkItems.some(w => {
        if (w.container_id === c.id) {
          if (w.assignee_id === filterAssigneeId) return true;
        }
        if (w.parent_id) {
          const parent = safeWorkItems.find(p => p.id === w.parent_id);
          if (parent?.container_id === c.id && w.assignee_id === filterAssigneeId) return true;
        }
        return false;
      });
      if (!hasItem) return false;
    }
    return true;
  });

  const historyContainers = safeContainers.filter(c => {
    if (c.type !== containerType)  return false;
    if (c.is_active !== false)     return false;
    if (currentUser?.role !== 'Admin') {
      const isAllowed = c.created_by === currentUser.id ||
        safeWorkItems.some(w => w.container_id === c.id && w.assignee_id === currentUser.id);
      if (!isAllowed) return false;
    }
    if (filterAssigneeId) {
      const hasItem = safeWorkItems.some(w => {
        if (w.container_id === c.id) {
          if (w.assignee_id === filterAssigneeId) return true;
        }
        if (w.parent_id) {
          const parent = safeWorkItems.find(p => p.id === w.parent_id);
          if (parent?.container_id === c.id && w.assignee_id === filterAssigneeId) return true;
        }
        return false;
      });
      if (!hasItem) return false;
    }
    return true;
  });

  const templateContainers = safeSavedContainers.filter(c => {
    if (c.type !== containerType) return false;
    if (currentUser?.role !== 'Admin') {
      const isAllowed = c.created_by === currentUser.id;
      if (!isAllowed) return false;
    }
    if (filterAssigneeId) {
      const hasItem = safeSavedTasks.some(w => {
        if (w.saved_container_id === c.id) {
          if (w.assignee_id === filterAssigneeId) return true;
        }
        if (w.parent_id) {
          const parent = safeSavedTasks.find(p => p.id === w.parent_id);
          if (parent?.saved_container_id === c.id && w.assignee_id === filterAssigneeId) return true;
        }
        return false;
      });
      if (!hasItem) return false;
    }
    return true;
  });

  // ── Work-item helpers (active containers → work_items) ────────────────────
  const getActionable  = (cid) => safeWorkItems.filter(w => w.container_id === cid && !w.in_planning_pool && w.type !== 'Phase');
  const getPhases      = (cid) => safeWorkItems.filter(w => w.container_id === cid && w.type === 'Phase').sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const getPhaseItems  = (pid) => safeWorkItems.filter(w => w.parent_id === pid);
  const getMilestones  = (cid) => safeWorkItems.filter(w => w.container_id === cid && w.type === 'Milestone');

  // ── Saved-item helpers (saved containers → saved_tasks) ───────────────────
  const getSavedPhases     = (cid) => safeSavedTasks.filter(w => w.saved_container_id === cid && w.type === 'Phase').sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const getSavedPhaseItems = (pid) => safeSavedTasks.filter(w => w.parent_id === pid);
  const getSavedMilestones = (cid) => safeSavedTasks.filter(w => w.saved_container_id === cid && w.type === 'Milestone');

  // Standalone tasks (no container)
  const standaloneTasks = safeWorkItems.filter(w =>
    !w.container_id && !w.in_planning_pool && w.type === 'Task' &&
    !w.parent_id && (currentUser?.role !== 'Admin' ? (w.assignee_id === currentUser.id || w.created_by === currentUser.id) : true) &&
    (filterAssigneeId ? w.assignee_id === filterAssigneeId : true)
  );
  const getSubItems = (pid) => safeWorkItems.filter(w => w.parent_id === pid);

  // Recurring templates (live in saved_tasks)
  const recurringTemplates = safeSavedTasks.filter(w => w.is_recurring &&
    (currentUser?.role !== 'Admin' ? (w.assignee_id === currentUser.id || w.created_by === currentUser.id) : true) &&
    (filterAssigneeId ? w.assignee_id === filterAssigneeId : true)
  );

  // ── Container actions ──────────────────────────────────────────────────────
  const mkContainer = (fields) => {
    const p = { title: fields.title, type: fields.type, created_by: currentUser.id, is_active: true };
    if (fields.source_template_id) p.source_template_id = fields.source_template_id;
    return p;
  };

  const submitCreate = async (asTemplate) => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    if (asTemplate) {
      await addSavedContainer({ title: newTitle.trim(), type: containerType, created_by: currentUser.id });
    } else {
      await addContainer(mkContainer({ title: newTitle.trim(), type: containerType }));
    }
    setSubmitting(false);
    setIsCreateOpen(false); setNewTitle('');
    setModeTab(asTemplate ? 'Saved' : 'Active');
  };

  const saveAsTemplate = async (c) => {
    const { data: tpl } = await addSavedContainer({ title: cName(c), type: c.type, created_by: currentUser.id });
    if (!tpl?.length) return;
    const tplId = tpl[0].id;
    for (const m of getMilestones(c.id)) {
      await addSavedTask({ title: m.title, type: 'Milestone', saved_container_id: tplId, status: 'Assigned', created_by: currentUser.id, expected_date: m.expected_date ?? null });
    }
    await updateContainer(c.id, { source_template_id: tplId });
    setModeTab('Saved');
  };

  const deployTemplate = async (tpl, phaseDates = {}) => {
    setDeploying(true);
    setDeployError(null);
    try {
      const { data: newCont, error: contErr } = await addContainer(mkContainer({ title: cName(tpl), type: tpl.type, source_template_id: tpl.id }));
      if (contErr || !newCont?.length) {
        setDeployError(contErr?.message || 'Failed to create container. Check permissions.');
        setDeploying(false); return;
      }
      const newId = newCont[0].id;
      if (tpl.type === 'Event') {
        for (const ph of getSavedPhases(tpl.id)) {
          const phDate = phaseDates[ph.id] || null;
          const { data: newPh } = await addWorkItem({ title: ph.title, type: 'Phase', container_id: newId, status: 'Assigned', created_by: currentUser.id, expected_date: phDate });
          for (const item of getSavedPhaseItems(ph.id)) {
            await addWorkItem({ title: item.title, type: 'Checklist', container_id: newId, parent_id: newPh?.[0]?.id ?? null, status: 'Assigned', assignee_id: item.assignee_id ?? null, created_by: currentUser.id, expected_date: phDate });
          }
        }
      } else {
        for (const m of getSavedMilestones(tpl.id)) {
          await addWorkItem({ title: m.title, type: 'Milestone', container_id: newId, status: 'Assigned', created_by: currentUser.id, expected_date: m.expected_date ?? null });
        }
      }
      setDeploying(false); setDeployModalTpl(null); setDeployPhaseDates({}); setModeTab('Active');
    } catch (err) {
      setDeployError(err?.message || 'Unexpected error during deploy.');
      setDeploying(false);
    }
  };

  const submitMilestone = async () => {
    if (!milestoneForm.title.trim() || !milestoneTarget) return;
    setSubmitting(true);
    const isSaved = safeSavedContainers.some(c => c.id === milestoneTarget);
    if (isSaved) {
      await addSavedTask({ title: milestoneForm.title.trim(), type: 'Milestone', saved_container_id: milestoneTarget, status: 'Assigned', created_by: currentUser.id, expected_date: milestoneForm.date || null, assignee_id: milestoneForm.assignee_id || null });
    } else {
      await addWorkItem({ title: milestoneForm.title.trim(), type: 'Milestone', container_id: milestoneTarget, status: 'Assigned', created_by: currentUser.id, expected_date: milestoneForm.date || null, assignee_id: milestoneForm.assignee_id || null });
    }
    setSubmitting(false); setMilestoneTarget(null); setMilestoneForm({ title: '', date: '', assignee_id: '' });
  };

  const submitPhase = async () => {
    if (!phaseForm.title.trim() || !phaseTarget) return;
    setSubmitting(true);
    const isSaved = safeSavedContainers.some(c => c.id === phaseTarget);
    if (isSaved) {
      await addSavedTask({ title: phaseForm.title.trim(), type: 'Phase', saved_container_id: phaseTarget, status: 'Assigned', created_by: currentUser.id, expected_date: null });
    } else {
      await addWorkItem({ title: phaseForm.title.trim(), type: 'Phase', container_id: phaseTarget, status: 'Assigned', created_by: currentUser.id, expected_date: phaseForm.date || null });
    }
    setSubmitting(false); setPhaseTarget(null); setPhaseForm({ title: '', date: '' });
  };

  const submitChecklist = async () => {
    if (!checklistForm.title.trim() || !checklistTarget) return;
    setSubmitting(true);
    const isSavedPhase = savedTaskIdSet.has(checklistTarget.phaseId);
    if (isSavedPhase) {
      const savedContainerId = safeSavedTasks.find(w => w.id === checklistTarget.phaseId)?.saved_container_id;
      await addSavedTask({ title: checklistForm.title.trim(), type: 'Checklist', saved_container_id: savedContainerId, parent_id: checklistTarget.phaseId, status: 'Assigned', assignee_id: checklistForm.assignee_id || null, created_by: currentUser.id, expected_date: checklistForm.date || checklistTarget.phaseDate || null });
    } else {
      const containerId = safeWorkItems.find(w => w.id === checklistTarget.phaseId)?.container_id;
      await addWorkItem({ title: checklistForm.title.trim(), type: 'Checklist', container_id: containerId, parent_id: checklistTarget.phaseId, status: 'Assigned', assignee_id: checklistForm.assignee_id || null, created_by: currentUser.id, expected_date: checklistForm.date || checklistTarget.phaseDate || null });
    }
    setSubmitting(false); setChecklistTarget(null); setChecklistForm({ title: '', assignee_id: '', date: '' });
  };

  const commitEditName = async () => {
    if (!editNameVal.trim() || !editNameId) return;
    if (safeSavedContainers.some(c => c.id === editNameId)) {
      await updateSavedContainer(editNameId, { title: editNameVal.trim() });
    } else {
      await updateContainer(editNameId, { title: editNameVal.trim() });
    }
    setEditNameId(null);
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
    const canManage = canManageContainer(containerId);
    const statusOrder = { 'Ongoing': 1, 'Assigned': 2, 'Not Started': 2, 'Completed': 3 };
    const sortedMilestones = [...milestones]
      .filter(m => (filterAssigneeId ? m.assignee_id === filterAssigneeId : true))
      .sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        if (a.expected_date && b.expected_date) return a.expected_date.localeCompare(b.expected_date);
        if (a.expected_date) return -1;
        if (b.expected_date) return 1;
        return 0;
      });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant border-b border-surface-container-high">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2">Milestone</th>
              <th className="px-3 py-2">Assignee</th>
              {showStatus && <th className="px-3 py-2">Status</th>}
              {showStatus && <th className="px-3 py-2">Deadline</th>}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {sortedMilestones.length === 0 && (
              <tr><td colSpan={showStatus ? 6 : 4} className="px-3 py-6 text-center text-on-surface-variant italic text-xs">No milestones yet.</td></tr>
            )}
            {sortedMilestones.map(m => {
              const ds = getDisplayStatus(m);
              const assignee = getProfile(m.assignee_id);
              const isExpanded = expandedItemId === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr className="group hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                    onClick={() => setExpandedItemId(isExpanded ? null : m.id)}>
                    <td className="w-8 px-2 py-2">
                      <span className={`material-symbols-outlined text-[16px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                    </td>
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
                    {showStatus && <td className="px-3 py-2.5 text-xs text-on-surface-variant">{m.expected_date ? fmtDate(m.expected_date) : '—'}</td>}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {showStatus && m.status === 'Assigned' && m.assignee_id === currentUser?.id && (
                          <button onClick={(e) => { e.stopPropagation(); updateAnyItem(m.id, { status: 'Ongoing' }); }}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-primary hover:opacity-90 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all">
                            <span className="material-symbols-outlined text-[11px]">play_arrow</span>Start
                          </button>
                        )}
                        {showStatus && m.status === 'Ongoing' && m.assignee_id === currentUser?.id && (
                          <button onClick={(e) => { e.stopPropagation(); setPendingCompleteItem(m); }}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-green-600 hover:opacity-90 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all">
                            <span className="material-symbols-outlined text-[11px]">check_circle</span>Complete
                          </button>
                        )}
                        {showStatus && m.status !== 'Completed' && (
                          <button onClick={(e) => { e.stopPropagation(); updateAnyItem(m.id, { expected_date: todayStr() }); }}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                            <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                          </button>
                        )}
                        {canManage && <button onClick={(e) => { e.stopPropagation(); setEditingItem(m); }} className="text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>}
                        {canManage && <DeleteBtn onDelete={() => deleteAnyItem(m.id)} size="xs" />}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`exp-${m.id}`}>
                      <td colSpan={showStatus ? 6 : 4} className="bg-surface-container-low/10 border-b border-surface-container-high p-0">
                        <ExpandedItemDetails
                          item={m}
                          workItems={safeWorkItems}
                          profiles={safeProfiles}
                          currentUser={currentUser}
                          onFollowUp={(item) => setFollowUpTarget(item)}
                          onViewDetail={handleViewDetail}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {(canManage || currentUser?.role === 'Assignee' || currentUser?.role === 'Manager') && (
          <div className="px-3 py-2 border-t border-surface-container-low">
            <button onClick={() => handleAddMilestoneClick(containerId)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Milestone
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Checklist table (active event phases) ─────────────────────────────────
  function ChecklistTable({ items, phaseId, phaseDate, showStatus }) {
    const filteredItems = items.filter(item => (filterAssigneeId ? item.assignee_id === filterAssigneeId : true));
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant border-b border-surface-container-high">
            <tr>
              <th className="w-8 px-2 py-1.5" />
              <th className="px-3 py-1.5">Subject</th>
              <th className="px-3 py-1.5">Assignee</th>
              {showStatus && <th className="px-3 py-1.5">Status</th>}
              <th className="px-3 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {filteredItems.length === 0 && (
              <tr><td colSpan={showStatus ? 5 : 4} className="px-3 py-4 text-center text-on-surface-variant italic text-xs">No items.</td></tr>
            )}
            {(showStatus ? sortByStatus(filteredItems) : filteredItems).map(item => {
              const ds = getDisplayStatus(item);
              const assignee = getProfile(item.assignee_id);
              const isExpanded = expandedItemId === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr className="group hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                    <td className="w-8 px-2 py-2">
                      <span className={`material-symbols-outlined text-[16px] text-on-surface-variant block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                    </td>
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
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {showStatus && item.status === 'Assigned' && item.assignee_id === currentUser?.id && (
                          <button onClick={(e) => { e.stopPropagation(); updateAnyItem(item.id, { status: 'Ongoing' }); }}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-primary hover:opacity-90 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all">
                            <span className="material-symbols-outlined text-[11px]">play_arrow</span>Start
                          </button>
                        )}
                        {showStatus && item.status === 'Ongoing' && item.assignee_id === currentUser?.id && (
                          <button onClick={(e) => { e.stopPropagation(); setPendingCompleteItem(item); }}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-green-600 hover:opacity-90 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all">
                            <span className="material-symbols-outlined text-[11px]">check_circle</span>Complete
                          </button>
                        )}
                        {showStatus && ds !== 'Completed' && ds !== 'Overdue' && (
                          <button onClick={(e) => { e.stopPropagation(); updateAnyItem(item.id, { expected_date: todayStr() }); }}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                            <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                          </button>
                        )}
                        {isAdmin && !showStatus && (
                          <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                        )}
                        {isAdmin && <DeleteBtn onDelete={() => deleteAnyItem(item.id)} size="xs" />}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`exp-${item.id}`}>
                      <td colSpan={showStatus ? 5 : 4} className="bg-surface-container-low/10 border-b border-surface-container-high p-0">
                        <ExpandedItemDetails
                          item={item}
                          workItems={safeWorkItems}
                          profiles={safeProfiles}
                          currentUser={currentUser}
                          onFollowUp={(it) => setFollowUpTarget(it)}
                          onViewDetail={handleViewDetail}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
      <div id={`container-card-${c.id}`} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${isExpanded ? 'border-primary/40' : 'border-outline-variant/30'}`}>
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
                  {c.expected_date && <span>{fmtDate(c.expected_date)}</span>}
                  <span>{allItems.length} items</span>
                  {isFromTemplate && <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">From Template</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {isExpanded && isProject && (
                <button
                  onClick={() => handleAddMilestoneClick(c.id)}
                  title="Add Milestone"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white px-2 py-1 rounded-xl transition-all mr-1"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>Milestone
                </button>
              )}
              <div className="text-right cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                <p className="text-lg font-black text-on-surface leading-none">{progress}%</p>
                <p className="text-[10px] text-on-surface-variant">Done</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200 cursor-pointer" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>expand_more</span>
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
            {canManageContainer(c.id) && (
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
                  isAdmin && (
                    <button onClick={() => setModeTab('Saved')} className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">edit</span> Edit in Saved Templates
                    </button>
                  )
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
                              {ph.expected_date && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${phToday ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>{phToday ? 'Today' : fmtDate(ph.expected_date)}</span>}
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
                          {phItems.length} item{phItems.length !== 1 ? 's' : ''} — unlocks when phase date ({ph.expected_date ? fmtDate(ph.expected_date) : 'unset'}) is reached.
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

            {isAdmin && c.is_active !== false && (
              <div className="px-5 py-3 border-t border-surface-container-low flex items-center gap-2 flex-wrap">
                {isProject && !isFromTemplate && (
                  <button onClick={() => saveAsTemplate(c)} className="flex items-center gap-1.5 text-xs font-bold border border-outline-variant/40 bg-white text-on-surface px-3 py-1.5 rounded-xl hover:bg-surface-container">
                    <span className="material-symbols-outlined text-[14px]">bookmark_add</span> Save as Template
                  </button>
                )}
                <button onClick={() => setDeactivateTarget(c)} className="flex items-center gap-1.5 text-xs font-bold text-error border border-error/20 bg-error/5 px-3 py-1.5 rounded-xl hover:bg-error/10 ml-auto">
                  <span className="material-symbols-outlined text-[14px]">pause_circle</span> Close {isProject ? 'Project' : 'Event'}
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
    const [addingSubFor, setAddingSubFor] = useState(null);
    const [stTitle, setStTitle] = useState('');
    const [stDate,  setStDate]  = useState('');
    const [stAssignee, setStAssignee] = useState('');
    const [stSaving, setStSaving] = useState(false);

    const openSubForm = (taskId) => { setAddingSubFor(taskId); setStTitle(''); setStDate(''); setStAssignee(''); };

    const handleAddSubtask = async (task) => {
      if (!stTitle.trim()) return;
      setStSaving(true);
      await addWorkItem({
        title: stTitle.trim(),
        expected_date: stDate || null,
        assignee_id: stAssignee || task.assignee_id || null,
        status: 'Assigned',
        type: 'Subtask',
        parent_id: task.id,
      });
      if (stDate && !task.expected_date) {
        await updateWorkItem(task.id, { expected_date: stDate });
      }
      setStSaving(false); setAddingSubFor(null);
    };

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
                  <td className="px-3 py-2.5 text-xs text-on-surface-variant">{task.expected_date ? fmtDate(task.expected_date) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                      {task.status === 'Assigned' && task.assignee_id === currentUser?.id && (
                        <button onClick={() => updateWorkItem(task.id, { status: 'Ongoing' })}
                          className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-primary hover:opacity-90 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all">
                          <span className="material-symbols-outlined text-[11px]">play_arrow</span>Start
                        </button>
                      )}
                      {task.status === 'Ongoing' && task.assignee_id === currentUser?.id && (
                        <button onClick={() => updateWorkItem(task.id, { status: 'Completed', completed_at: new Date().toISOString() })}
                          className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-green-600 hover:opacity-90 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all">
                          <span className="material-symbols-outlined text-[11px]">check_circle</span>Complete
                        </button>
                      )}
                      {ds !== 'Completed' && ds !== 'Overdue' && (
                        <button onClick={() => updateWorkItem(task.id, { expected_date: todayStr() })}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                          <span className="material-symbols-outlined text-[11px]">today</span>Set Today
                        </button>
                      )}
                      {task.status !== 'Completed' && (
                        <button onClick={() => addingSubFor === task.id ? setAddingSubFor(null) : openSubForm(task.id)}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all">
                          <span className="material-symbols-outlined text-[11px]">add</span>Sub
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
                      <td className="px-4 py-2 pl-14 border-l-2 border-primary/20">
                        <div className="flex items-center gap-2">
                          <span className="text-primary/50 text-[11px]">↳</span>
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
                      <td className="px-3 py-2 text-[11px] text-on-surface-variant">{sub.expected_date ? fmtDate(sub.expected_date) : '—'}</td>
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
                // Inline subtask form row
                addingSubFor === task.id && (
                  <tr key={`sub-form-${task.id}`} className="bg-primary/5 border-l-2 border-primary/40">
                    <td className="px-4 py-2 pl-10" colSpan={5}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          autoFocus
                          className="border border-outline-variant/50 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-[160px]"
                          placeholder="Subtask title…"
                          value={stTitle} onChange={e => setStTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddSubtask(task)}
                        />
                        {!isAdmin ? null : (
                          <select className="border border-outline-variant/50 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={stAssignee} onChange={e => setStAssignee(e.target.value)}>
                            <option value="">Same assignee</option>
                            {filteredProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        )}
                        <input type="date" className="border border-outline-variant/50 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={stDate} onChange={e => setStDate(e.target.value)} />
                        <button onClick={() => handleAddSubtask(task)} disabled={stSaving || !stTitle.trim()}
                          className="text-[10px] font-bold bg-primary text-white px-2.5 py-1 rounded-lg hover:opacity-90 disabled:opacity-50 whitespace-nowrap">
                          {stSaving ? '…' : 'Add Subtask'}
                        </button>
                        <button onClick={() => setAddingSubFor(null)}
                          className="text-[10px] font-bold border border-outline-variant/40 text-on-surface-variant px-2 py-1 rounded-lg hover:bg-surface-container whitespace-nowrap">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Recurring section ──────────────────────────────────────────────────────
  function RecurringSection() {
    const [editingRec, setEditingRec]     = useState(null);
    const [modalData, setModalData]       = useState({});
    const [saving, setSaving]             = useState(false);
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    
    // Group states
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [groupTitle, setGroupTitle] = useState('');
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupSaving, setGroupSaving] = useState(false);

    // Task within Group states
    const [addingTaskForGroup, setAddingTaskForGroup] = useState(null);
    const [taskForm, setTaskForm] = useState({ title: '', assignee_id: '', recurrence_type: 'daily' });
    const [taskSaving, setTaskSaving] = useState(false);

    // Group shift states
    const [shiftTargetGroup, setShiftTargetGroup] = useState(null);
    const [shiftSelectedIds, setShiftSelectedIds] = useState(new Set());
    const [shifting, setShifting] = useState(false);
    
    // Grouping / Move Target states
    const [moveTarget, setMoveTarget] = useState(null);
    let pressTimer;

    const handlePressStart = (task) => {
      if (!canEdit) return;
      pressTimer = setTimeout(() => {
        setMoveTarget(task);
      }, 600);
    };

    const handlePressEnd = () => {
      clearTimeout(pressTimer);
    };

    const canEdit = isAdmin || currentUser?.role === 'Manager';

    const isAssignee = currentUser?.role !== 'Admin' && currentUser?.role !== 'Manager';
    const rawRecurringGroups = safeSavedTasks.filter(w => w.type === 'Group');
    const rawRecurringTasks = safeSavedTasks.filter(w => w.is_recurring && w.type !== 'Group');

    const recurringTasks = isAssignee
      ? rawRecurringTasks.filter(t => t.assignee_id === currentUser?.id)
      : rawRecurringTasks;

    const recurringGroups = isAssignee
      ? rawRecurringGroups.filter(g => 
          recurringTasks.some(t => t.parent_id === g.id)
        )
      : rawRecurringGroups;

    const handleCreateGroup = async () => {
      if (!groupTitle.trim()) return;
      setGroupSaving(true);
      await addSavedTask({
        title: groupTitle.trim(), type: 'Group',
        is_recurring: false, is_active: true
      });
      setGroupTitle(''); setCreatingGroup(false); setGroupSaving(false);
    };

    const handleEditGroup = async () => {
      if (!editingGroup || !editingGroup.title.trim()) return;
      setGroupSaving(true);
      await updateSavedTask(editingGroup.id, { title: editingGroup.title.trim() });
      setEditingGroup(null); setGroupSaving(false);
    };

    const handleAddTask = async (groupId) => {
      if (!taskForm.title.trim()) return;
      setTaskSaving(true);
      await addSavedTask({
        title: taskForm.title.trim(), type: 'Task',
        parent_id: groupId, assignee_id: taskForm.assignee_id || null,
        status: 'Assigned', is_recurring: true, is_active: true,
        recurrence_rule: { type: taskForm.recurrence_type }
      });
      setTaskForm({ title: '', assignee_id: '', recurrence_type: 'daily' });
      setTaskSaving(false); setAddingTaskForGroup(null);
    };

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
      await updateSavedTask(editingRec.id, {
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

        <div className="flex flex-col gap-4">
          {canEdit && (
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-outline-variant/30">
              <div className="flex flex-col">
                <span className="font-bold text-on-surface">Task Groups</span>
                <span className="text-xs text-on-surface-variant">Organize recurring tasks into groups</span>
              </div>
              {!creatingGroup ? (
                <button onClick={() => setCreatingGroup(true)} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90">
                  <span className="material-symbols-outlined text-[18px]">create_new_folder</span> New Group
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input autoFocus className={fieldCls + " py-1.5 min-w-[200px]"} value={groupTitle} onChange={e => setGroupTitle(e.target.value)} placeholder="Group Name..." />
                  <button onClick={handleCreateGroup} disabled={groupSaving || !groupTitle.trim()} className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">Save</button>
                  <button onClick={() => setCreatingGroup(false)} className="text-on-surface-variant px-3 py-1.5 rounded-lg text-sm font-bold border border-outline-variant/40 hover:bg-surface-container">Cancel</button>
                </div>
              )}
            </div>
          )}

          {recurringGroups.map(group => {
            const isExpanded = expandedGroupId === group.id;
            const tasksInGroup = recurringTasks.filter(t => t.parent_id === group.id);
            return (
              <div key={group.id} className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                <div className="px-4 py-3 bg-surface-container-lowest/50 border-b border-outline-variant/20 flex items-center justify-between cursor-pointer hover:bg-surface-container-low/40 transition-colors"
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                    <span className="material-symbols-outlined text-primary/70">folder</span>
                    {editingGroup?.id === group.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input autoFocus className={fieldCls + " py-1 w-48 text-xs"} value={editingGroup.title} onChange={e => setEditingGroup({...editingGroup, title: e.target.value})} />
                        <button onClick={handleEditGroup} className="text-primary font-bold text-xs">Save</button>
                        <button onClick={() => setEditingGroup(null)} className="text-on-surface-variant font-bold text-xs">Cancel</button>
                      </div>
                    ) : (
                      <span className="font-bold text-on-surface">{group.title}</span>
                    )}
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tasksInGroup.length} items</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditingGroup(group)} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                      <DeleteBtn onDelete={() => deleteSavedTask(group.id)} />
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="p-4 bg-surface-container-lowest">
                    {tasksInGroup.length === 0 ? (
                      <p className="text-xs text-center text-on-surface-variant py-4">No tasks in this group yet.</p>
                    ) : (
                      <table className="w-full text-left text-xs mb-3">
                        <thead className="text-[10px] uppercase font-bold text-outline border-b border-outline-variant/30">
                          <tr>
                            <th className="py-2 px-3">Task Name</th>
                            <th className="py-2 px-3">Assignee</th>
                            <th className="py-2 px-3">Recurrence</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            {canEdit && <th className="py-2 px-3 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {tasksInGroup.map(task => {
                            const aName = safeProfiles.find(p => p.id === task.assignee_id)?.name ?? 'Unassigned';
                            return (
                              <tr key={task.id} 
                                className="hover:bg-surface-container-low/30 select-none cursor-pointer"
                                onMouseDown={() => handlePressStart(task)}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressEnd}
                                onTouchStart={() => handlePressStart(task)}
                                onTouchEnd={handlePressEnd}
                              >
                                <td className="py-2 px-3 font-medium text-on-surface">{task.title}</td>
                                <td className="py-2 px-3 text-on-surface-variant">{aName.split(' ')[0]}</td>
                                <td className="py-2 px-3 text-on-surface-variant">{getRecurrenceLabel(task.recurrence_rule)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${task.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                                    {task.is_active ? 'Active' : 'Paused'}
                                  </span>
                                </td>
                                {canEdit && (
                                  <td className="py-2 px-3 text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                      <button onClick={() => openEdit(task)} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                      <DeleteBtn onDelete={() => deleteSavedTask(task.id)} size="xs" />
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {canEdit && (
                      addingTaskForGroup === group.id ? (
                        <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg">
                          <input autoFocus className={fieldCls + " py-1.5 text-xs flex-1"} placeholder="Task Title" value={taskForm.title} onChange={e => setTaskForm(f => ({...f, title: e.target.value}))} />
                          <select className={fieldCls + " py-1.5 text-xs w-auto"} value={taskForm.assignee_id} onChange={e => setTaskForm(f => ({...f, assignee_id: e.target.value}))}>
                            <option value="">Unassigned</option>
                            {filteredProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select className={fieldCls + " py-1.5 text-xs w-auto"} value={taskForm.recurrence_type} onChange={e => setTaskForm(f => ({...f, recurrence_type: e.target.value}))}>
                            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                          </select>
                          <button onClick={() => handleAddTask(group.id)} disabled={taskSaving || !taskForm.title.trim()} className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">Save</button>
                          <button onClick={() => setAddingTaskForGroup(null)} className="text-on-surface-variant px-3 py-1.5 border border-outline-variant/30 rounded-lg text-xs font-bold hover:bg-surface-container whitespace-nowrap">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 mt-2 px-3 flex-wrap">
                          <button onClick={() => setAddingTaskForGroup(group.id)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                            <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Recurring Task to Group
                          </button>
                          <button 
                            onClick={() => { setShiftTargetGroup(group); setShiftSelectedIds(new Set()); }}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                          >
                            <span className="material-symbols-outlined text-[14px]">drive_file_move</span> Shift/Move Items to Group
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped Tasks */}
          {(() => {
            const ungrouped = recurringTasks.filter(t => !t.parent_id);
            if (ungrouped.length === 0) return null;
            const isExpanded = expandedGroupId === 'ungrouped';
            return (
              <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                <div className="px-4 py-3 bg-surface-container-lowest/50 border-b border-outline-variant/20 flex items-center justify-between cursor-pointer hover:bg-surface-container-low/40 transition-colors"
                  onClick={() => setExpandedGroupId(isExpanded ? null : 'ungrouped')}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                    <span className="material-symbols-outlined text-outline">task</span>
                    <span className="font-bold text-on-surface">Ungrouped Tasks</span>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ungrouped.length} items</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4 bg-surface-container-lowest">
                    <table className="w-full text-left text-xs mb-3">
                      <thead className="text-[10px] uppercase font-bold text-outline border-b border-outline-variant/30">
                        <tr>
                          <th className="py-2 px-3">Task Name</th>
                          <th className="py-2 px-3">Assignee</th>
                          <th className="py-2 px-3">Recurrence</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          {canEdit && <th className="py-2 px-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {ungrouped.map(task => {
                          const aName = safeProfiles.find(p => p.id === task.assignee_id)?.name ?? 'Unassigned';
                          return (
                            <tr key={task.id} 
                                className="hover:bg-surface-container-low/30 select-none cursor-pointer"
                                onMouseDown={() => handlePressStart(task)}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressEnd}
                                onTouchStart={() => handlePressStart(task)}
                                onTouchEnd={handlePressEnd}
                              >
                              <td className="py-2 px-3 font-medium text-on-surface">{task.title}</td>
                              <td className="py-2 px-3 text-on-surface-variant">{aName.split(' ')[0]}</td>
                              <td className="py-2 px-3 text-on-surface-variant">{getRecurrenceLabel(task.recurrence_rule)}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${task.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                                  {task.is_active ? 'Active' : 'Paused'}
                                </span>
                              </td>
                              {canEdit && (
                                <td className="py-2 px-3 text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button onClick={() => openEdit(task)} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                    <DeleteBtn onDelete={() => deleteSavedTask(task.id)} size="xs" />
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {moveTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs" onClick={() => setMoveTarget(null)}>
            <div className="bg-white rounded-xl shadow-xl w-72 p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-sm text-on-surface">Move "{moveTarget.title}" to Group</h3>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                <button
                  onClick={async () => {
                    await updateSavedTask(moveTarget.id, { parent_id: null });
                    setMoveTarget(null);
                  }}
                  className="px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-slate-100 text-on-surface-variant flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_off</span>
                  No Group (Ungroup)
                </button>
                {recurringGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={async () => {
                      await updateSavedTask(moveTarget.id, { parent_id: g.id });
                      setMoveTarget(null);
                    }}
                    className={`px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-slate-100 flex items-center gap-2 ${
                      moveTarget.parent_id === g.id ? 'bg-primary/5 text-primary' : 'text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">folder</span>
                    {g.title}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMoveTarget(null)}
                className="mt-2 py-1.5 text-xs font-bold border border-outline-variant/40 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {shiftTargetGroup && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setShiftTargetGroup(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">drive_file_move</span>
                  Move tasks to "{shiftTargetGroup.title}"
                </h3>
                <button onClick={() => setShiftTargetGroup(null)} className="p-1 rounded-lg hover:bg-slate-100">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant">Select recurring tasks from other groups or ungrouped to move to this group.</p>
              
              <div className="max-h-60 overflow-y-auto flex flex-col gap-2 my-2 pr-1">
                {rawRecurringTasks.filter(t => t.parent_id !== shiftTargetGroup.id).map(task => {
                  const currentGroup = rawRecurringGroups.find(g => g.id === task.parent_id);
                  const isChecked = shiftSelectedIds.has(task.id);
                  return (
                    <label key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {
                          setShiftSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(task.id)) next.delete(task.id);
                            else next.add(task.id);
                            return next;
                          });
                        }}
                        className="rounded mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-on-surface leading-tight truncate">{task.title}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          {currentGroup ? `Currently in: ${currentGroup.title}` : 'Currently: Ungrouped'}
                        </p>
                      </div>
                    </label>
                  );
                })}
                {rawRecurringTasks.filter(t => t.parent_id !== shiftTargetGroup.id).length === 0 && (
                  <p className="text-xs text-on-surface-variant italic py-4 text-center">No other recurring tasks available.</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 border-t pt-3">
                <button 
                  onClick={() => setShiftTargetGroup(null)}
                  className="px-4 py-2 text-xs font-bold border border-outline-variant/40 rounded-lg text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button 
                  disabled={shifting || shiftSelectedIds.size === 0}
                  onClick={async () => {
                    setShifting(true);
                    for (const taskId of shiftSelectedIds) {
                      await updateSavedTask(taskId, { parent_id: shiftTargetGroup.id });
                    }
                    setShifting(false);
                    setShiftTargetGroup(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {shifting ? 'Moving...' : `Move ${shiftSelectedIds.size} Items`}
                </button>
              </div>
            </div>
          </div>
        )}
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
    const phases     = isProject ? [] : getSavedPhases(active?.id);
    const milestones = getSavedMilestones(active?.id);
    const isTplEditingName = editNameId === active?.id;

    return (
      <>
        {/* Desktop View */}
        <div className="hidden md:flex gap-4 min-h-[520px]">
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
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); setDeployModalTpl(c); setDeployPhaseDates({}); }} disabled={deploying}
                          className="flex-1 py-1.5 text-xs font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50">{deploying ? '…' : 'Deploy'}</button>
                      )}
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
                        const items = getSavedPhaseItems(ph.id);
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
                                    <DeleteBtn onDelete={() => deleteSavedTask(ph.id)} />
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

                {isAdmin && (
                  <div className="px-6 py-4 border-t border-surface-container-high flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant">Deploy creates a live {isProject ? 'project' : 'event'} from this template</span>
                    <button onClick={() => { setDeployModalTpl(active); setDeployPhaseDates({}); }} disabled={deploying}
                      className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                      {deploying
                        ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Deploying…</>
                        : <><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Deploy {isProject ? 'Project' : 'Event'}</>
                      }
                    </button>
                  </div>
                )}
              </>
            ) : <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">Select a template.</div>}
          </div>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3 w-full">
          {templateContainers.map(c => {
            const isExpanded = (selectedTplId === c.id);
            const isProj = c.type === 'Project';
            const phs = isProj ? [] : getSavedPhases(c.id);
            const ms = getSavedMilestones(c.id);
            const isEditing = editNameId === c.id;

            return (
              <div 
                key={c.id} 
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${
                  isExpanded ? 'border-primary/60' : 'border-outline-variant/30'
                }`}
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
                  onClick={() => setSelectedTplId(isExpanded ? null : c.id)}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-on-surface text-sm leading-tight truncate">{cName(c)}</h3>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      {isProj ? `${ms.length} milestones` : `${phs.length} phases`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <button 
                        onClick={() => { setDeployModalTpl(c); setDeployPhaseDates({}); }}
                        className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-lg hover:opacity-90 animate-fade-in"
                      >
                        Deploy
                      </button>
                    )}
                    <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/30 flex flex-col gap-4">
                    {isAdmin && (
                      <div className="flex items-center gap-2 border-b pb-3 mb-1">
                        {isEditing ? (
                          <>
                            <input autoFocus className="flex-1 border border-outline-variant/50 rounded-xl px-2.5 py-1 text-xs font-medium focus:outline-none"
                              value={editNameVal} onChange={e => setEditNameVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEditName(); if (e.key === 'Escape') setEditNameId(null); }} />
                            <button onClick={commitEditName} className="text-xs font-bold text-primary hover:underline">Save</button>
                            <button onClick={() => setEditNameId(null)} className="text-xs font-bold text-on-surface-variant hover:underline">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => { setEditNameId(c.id); setEditNameVal(cName(c)); }} className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">edit</span> Edit Name
                          </button>
                        )}
                      </div>
                    )}

                    {isProj ? (
                      <MilestoneTable milestones={ms} showStatus={false} containerId={c.id} />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {phs.map((ph, i) => {
                          const items = getSavedPhaseItems(ph.id);
                          return (
                            <div key={ph.id} className="rounded-xl border border-outline-variant/20 overflow-hidden bg-white">
                              <div className="px-3 py-2 bg-surface-container-low/40 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                                  <h4 className="text-[11px] font-black text-on-surface uppercase tracking-wide">{ph.title}</h4>
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-1 items-center">
                                    <button onClick={() => { setChecklistTarget({ phaseId: ph.id, phaseDate: ph.expected_date }); setChecklistForm({ title: '', assignee_id: '', date: '' }); }}
                                      className="flex items-center gap-0.5 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-lg hover:opacity-90">
                                      <span className="material-symbols-outlined text-[10px]">add</span> Add
                                    </button>
                                    <DeleteBtn onDelete={() => deleteSavedTask(ph.id)} />
                                  </div>
                                )}
                              </div>
                              <ChecklistTable items={items} phaseId={ph.id} phaseDate={ph.expected_date} showStatus={false} />
                            </div>
                          );
                        })}
                        {phs.length === 0 && <p className="text-xs text-on-surface-variant italic">No phases yet.</p>}
                        {isAdmin && (
                          <button onClick={() => setPhaseTarget(c.id)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline self-start">
                            <span className="material-symbols-outlined text-[13px]">add_circle</span> Add Phase
                          </button>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="text-[10px] text-on-surface-variant">Deploy template to create live project/event</span>
                        <button 
                          onClick={() => { setDeployModalTpl(c); setDeployPhaseDates({}); }}
                          className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">rocket_launch</span> Deploy Template
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
            {[
              { key: 'Projects', icon: 'folder_open',  color: 'text-indigo-600' },
              ...( isAdmin ? [{ key: 'Events', icon: 'event', color: 'text-emerald-600' }] : []),
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
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterAssigneeId}
              onChange={e => setFilterAssigneeId(e.target.value)}
              className="border border-outline-variant/40 bg-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Assignees</option>
              {safeProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <StaffToggle />
          </div>
        </div>


        {typeTab !== 'Tasks' && currentUser?.role !== 'Assignee' && (
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
              {['Active', 'Saved', 'History'].map(m => (
                <button key={m} onClick={() => { setModeTab(m); setExpandedId(null); }}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${modeTab === m ? (m === 'Active' ? 'bg-primary text-white shadow-sm' : 'bg-white text-on-surface shadow-sm') : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {m === 'Active'
                    ? <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${modeTab === 'Active' ? 'bg-green-300' : 'bg-outline-variant'}`} />
                    : m === 'History' ? <span className="material-symbols-outlined text-[14px]">history</span>
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
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Projects Card */}
            <div 
              onClick={() => setActiveCardDetail(activeCardDetail === 'projects' ? null : 'projects')}
              className={`bg-white rounded-2xl border p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
                activeCardDetail === 'projects' ? 'border-primary ring-1 ring-primary/20' : 'border-outline-variant/30'
              }`}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Total Projects</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">{activeContainers.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <span className="material-symbols-outlined">folder</span>
              </div>
            </div>

            {/* Total Milestones Card */}
            <div 
              onClick={() => setActiveCardDetail(activeCardDetail === 'milestones' ? null : 'milestones')}
              className={`bg-white rounded-2xl border p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
                activeCardDetail === 'milestones' ? 'border-primary ring-1 ring-primary/20' : 'border-outline-variant/30'
              }`}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Total Milestones</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">
                  {safeWorkItems.filter(w => w.type === 'Milestone' && activeContainers.some(c => c.id === w.container_id)).length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <span className="material-symbols-outlined">flag</span>
              </div>
            </div>

            {/* Completed Card */}
            <div 
              onClick={() => setActiveCardDetail(activeCardDetail === 'completed' ? null : 'completed')}
              className={`bg-white rounded-2xl border p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
                activeCardDetail === 'completed' ? 'border-primary ring-1 ring-primary/20' : 'border-outline-variant/30'
              }`}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Completed Milestones</p>
                <h3 className="text-2xl font-black text-green-600 mt-1">
                  {safeWorkItems.filter(w => w.type === 'Milestone' && w.status === 'Completed' && activeContainers.some(c => c.id === w.container_id)).length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
            </div>
          </div>

          {/* Collapsible Details List */}
          {activeCardDetail && (
            <div className="bg-white rounded-2xl border border-outline-variant/30 p-5 mt-1 animate-fade-in flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                  {activeCardDetail === 'projects' && 'Active Projects List'}
                  {activeCardDetail === 'milestones' && 'Milestones by Project'}
                  {activeCardDetail === 'completed' && 'Completed Milestones Details'}
                </h3>
                <button 
                  onClick={() => setActiveCardDetail(null)} 
                  className="w-6 h-6 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-3">
                {activeContainers.map(project => {
                  const milestones = safeWorkItems.filter(w => w.container_id === project.id && w.type === 'Milestone');
                  const completedMilestones = milestones.filter(m => m.status === 'Completed');

                  if (activeCardDetail === 'projects') {
                    return (
                      <div key={project.id} 
                        onClick={() => handleProjectClick(project.id)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/10 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-on-surface">{project.title}</span>
                        <span className="text-[10px] font-extrabold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full">{project.progress ?? 0}% Done</span>
                      </div>
                    );
                  }

                  if (activeCardDetail === 'milestones') {
                    if (milestones.length === 0) return null;
                    return (
                      <div key={project.id} className="flex flex-col gap-1.5 p-3 rounded-xl border border-outline-variant/10 bg-slate-50/50">
                        <span 
                          onClick={() => handleProjectClick(project.id)}
                          className="text-xs font-bold text-on-surface hover:text-primary hover:underline cursor-pointer"
                        >
                          {project.title}
                        </span>
                        <div className="pl-3 border-l border-outline-variant/30 flex flex-col gap-1 mt-1">
                          {milestones.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-[11px] font-medium text-on-surface-variant">
                              <span>• {m.title}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                m.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                m.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{m.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (activeCardDetail === 'completed') {
                    if (completedMilestones.length === 0) return null;
                    return (
                      <div key={project.id} className="flex flex-col gap-1.5 p-3 rounded-xl border border-outline-variant/10 bg-slate-50/50">
                        <span 
                          onClick={() => handleProjectClick(project.id)}
                          className="text-xs font-bold text-on-surface hover:text-primary hover:underline cursor-pointer"
                        >
                          {project.title}
                        </span>
                        <div className="pl-3 border-l border-outline-variant/30 flex flex-col gap-1 mt-1">
                          {completedMilestones.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-[11px] font-medium text-green-700">
                              <span>• {m.title}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-green-100 text-green-700">Completed</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeContainers.length === 0 ? (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>folder_open</span>
                <p className="font-bold text-on-surface-variant">No active projects.</p>
              </div>
            ) : activeContainers.map(c => <ActiveCard key={c.id} c={c} />)}
          </div>
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

      {/* ── Projects/Events History ── */}
      {typeTab !== 'Tasks' && modeTab === 'History' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {historyContainers.length === 0 ? (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/30 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <p className="font-bold text-on-surface-variant">No closed items in history.</p>
            </div>
          ) : historyContainers.map(c => <ActiveCard key={c.id} c={c} />)}
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
            <select className={inputCls} value={milestoneForm.assignee_id} onChange={e => setMilestoneForm(f => ({ ...f, assignee_id: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {milestoneAssigneeOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={submitMilestone} disabled={submitting || !milestoneForm.title.trim()} className={btnPrimary}>{submitting ? 'Adding…' : 'Add Milestone'}</button>
          </div>
        </Modal>
      )}
      {phaseTarget && (
        <Modal title="Add Phase" onClose={() => setPhaseTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Phase name…" value={phaseForm.title} onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))} />
            {!safeSavedContainers.some(c => c.id === phaseTarget) && (
              <input type="date" className={inputCls} value={phaseForm.date} onChange={e => setPhaseForm(f => ({ ...f, date: e.target.value }))} />
            )}
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
            <button onClick={submitChecklist} disabled={submitting || !checklistForm.title.trim()} className={btnPrimary}>{submitting ? 'Adding…' : 'Add Item'}</button>
          </div>
        </Modal>
      )}
      {deactivateTarget && (
        <Modal title={`Close ${deactivateTarget.type}?`} onClose={() => setDeactivateTarget(null)}>
          <p className="text-sm text-on-surface-variant">"{cName(deactivateTarget)}" will be moved to History.</p>
          <div className="flex flex-col gap-2">
            {deactivateTarget.type === 'Project' && !deactivateTarget.source_template_id && (
              <button onClick={() => doDeactivate(deactivateTarget, true)} className={btnPrimary}>
                <span className="flex items-center gap-1.5 justify-center"><span className="material-symbols-outlined text-[16px]">bookmark_add</span> Save as Template & Close</span>
              </button>
            )}
            <button onClick={() => doDeactivate(deactivateTarget, false)} className="w-full bg-error/10 text-error border border-error/20 px-4 py-2 rounded-xl text-sm font-bold hover:bg-error/20">Close Without Saving</button>
            <button onClick={() => setDeactivateTarget(null)} className={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
      {editingItem && (
        <EditItemModal item={editingItem} profiles={safeProfiles} currentUser={currentUser} onClose={() => setEditingItem(null)} onSave={updateAnyItem} />
      )}

      {/* ── Deploy Modal ── */}
      {deployModalTpl && (() => {
        const tpl = deployModalTpl;
        const isEvent = tpl.type === 'Event';
        const phases = isEvent ? getSavedPhases(tpl.id) : [];
        const canDeploy = true; // Phase dates are optional during deploy
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={() => setDeployModalTpl(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">rocket_launch</span>
                  <div>
                    <h2 className="font-bold text-lg font-headline">Deploy — {cName(tpl)}</h2>
                    {isEvent && phases.length > 0 && (
                      <p className="text-xs text-on-surface-variant">Set a due date for each phase</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setDeployModalTpl(null)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
              </div>

              <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                {isEvent && phases.length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">No phases in this template. Deploy will create an empty event.</p>
                )}
                {isEvent && phases.map((ph, i) => (
                  <div key={ph.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{ph.title}</p>
                      <p className="text-[10px] text-on-surface-variant">{getSavedPhaseItems(ph.id).length} items</p>
                    </div>
                    <input
                      type="date"
                      className="border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary flex-shrink-0"
                      value={deployPhaseDates[ph.id] || ''}
                      onChange={e => setDeployPhaseDates(prev => ({ ...prev, [ph.id]: e.target.value }))}
                    />
                  </div>
                ))}
                {!isEvent && (
                  <p className="text-sm text-on-surface-variant">Deploy will create a live project from this template.</p>
                )}
              </div>

              {deployError && (
                <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">{deployError}</div>
              )}
              {/* Optional dates warning removed */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-container">
                <button className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={() => { setDeployModalTpl(null); setDeployError(null); }} disabled={deploying}>Cancel</button>
                <button
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl flex items-center gap-2 disabled:opacity-50"
                  disabled={!canDeploy || deploying}
                  onClick={() => deployTemplate(tpl, deployPhaseDates)}
                >
                  {deploying
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Deploying…</>
                    : <><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Confirm Deploy</>
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {pendingCompleteItem && (
        <CompletionPanel
          item={pendingCompleteItem}
          profiles={safeProfiles}
          currentUser={currentUser}
          onConfirm={handleProjectComplete}
          onCancel={() => setPendingCompleteItem(null)}
        />
      )}

      {followUpTarget && (
        <FollowUpModal
          completedItem={followUpTarget}
          profiles={safeProfiles}
          currentUser={currentUser}
          onCancel={() => setFollowUpTarget(null)}
          onConfirm={async (data) => {
            await createFollowUpTask(followUpTarget.id, data);
            setExpandedItemId(null);
            setFollowUpTarget(null);
          }}
        />
      )}

      {/* FAB: Projects (all roles) + Events Saved templates (admin only) */}
      {(typeTab === 'Projects' || (typeTab === 'Events' && modeTab === 'Saved' && isAdmin)) && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
          <button onClick={() => setIsCreateOpen(true)}
            className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-[28px]">add</span>
          </button>
        </div>
      )}
    </div>
  );
}
