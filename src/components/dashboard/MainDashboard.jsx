import { useState, useEffect } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits, getStatusBadgeClass, isItemExcludedByAbsence } from '../../lib/statusUtils';
import { fmtDate } from '../../lib/dateUtils';
import CompletionPanel from '../common/CompletionPanel';
import AbsenceModal from '../common/AbsenceModal';
import FilterBar from '../common/FilterBar';

// ─── Item detail modal ────────────────────────────
function ItemDetailModal({ item, containers, workItems, profiles, onClose, onStart, onComplete }) {
  const container = item.container_id ? containers.find(c => c.id === item.container_id) : null;
  const parent    = item.parent_id    ? workItems.find(w => w.id === item.parent_id)     : null;
  const assignee  = item.assignee_id  ? profiles.find(p => p.id === item.assignee_id)    : null;
  const status    = getDisplayStatus(item);
  const followUps = workItems.filter(w => w.linked_to === item.id);

  const typeColors = {
    Task: 'bg-blue-100 text-blue-700', Milestone: 'bg-purple-100 text-purple-700',
    Checklist: 'bg-green-100 text-green-700', Subtask: 'bg-orange-100 text-orange-700',
    Phase: 'bg-emerald-100 text-emerald-700',
  };
  const statusColors = {
    Overdue: 'bg-red-100 text-red-700', Ongoing: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700', 'Not Started': 'bg-amber-100 text-amber-700',
    Assigned: 'bg-surface-container text-on-surface-variant',
  };

  const Row = ({ label, value }) => value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-container last:border-0">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-on-surface font-medium flex-1">{value}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${typeColors[item.type] || 'bg-surface-container text-on-surface-variant'}`}>{item.type || 'Task'}</span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusColors[status] || ''}`}>{status}</span>
            </div>
            <h2 className="font-bold text-base text-on-surface leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="px-6 py-2 overflow-y-auto max-h-[60vh]">
          <Row label="Due Date"  value={item.expected_date ? fmtDate(item.expected_date) : 'No date set'} />
          {assignee  && <Row label="Assignee"  value={assignee.name} />}
          {container && <Row label={container.type} value={container.title} />}
          {parent    && <Row label="Parent"    value={parent.title} />}
          {item.priority && <Row label="Priority" value={item.priority} />}
          {item.description && <Row label="Description" value={item.description} />}
          {item.status === 'Completed' && item.completion_note && (
            <div className="py-2.5 border-b border-surface-container">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Completion Note</span>
              <p className="text-sm text-on-surface font-medium bg-green-50 border border-green-100 rounded-xl px-3 py-2">{item.completion_note}</p>
            </div>
          )}
          {item.completion_tag && <Row label="Tag" value={item.completion_tag} />}
          {followUps.length > 0 && (
            <div className="py-2.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Follow-up Tasks</span>
              <div className="flex flex-col gap-1.5">
                {followUps.map(f => {
                  const fds = getDisplayStatus(f);
                  const fCls = fds === 'Completed' ? 'bg-green-100 text-green-700' : fds === 'Overdue' ? 'bg-red-100 text-red-700' : fds === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant';
                  return (
                    <div key={f.id} className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2">
                      <span className="text-sm font-medium text-on-surface flex-1 leading-tight">{f.title}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${fCls}`}>{fds}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-surface-container flex gap-2">
          {item.status === 'Assigned' && onStart && (
            <button
              className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              onClick={() => { onStart(item.id); onClose(); }}
            >START</button>
          )}
          {item.status === 'Ongoing' && onComplete && (
            <button
              className="flex-1 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              onClick={() => { onComplete(item); onClose(); }}
            >COMPLETE</button>
          )}
          <button className="flex-1 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors border border-outline-variant/30" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Expandable work item card ───────────────────────────────────
function WorkItemCard({ item, containers, workItems, onStart, onComplete, onViewDetail, readOnly }) {
  const { addWorkItem, updateWorkItem } = useDataContext();
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [stTitle, setStTitle] = useState('');
  const [stDate, setStDate]   = useState('');
  const [stSaving, setStSaving] = useState(false);

  const container = item.container_id ? (containers || []).find(c => c.id === item.container_id) : null;
  const parent    = item.parent_id    ? (workItems  || []).find(w => w.id === item.parent_id)    : null;
  const parentContainer = parent?.container_id ? (containers || []).find(c => c.id === parent.container_id) : null;
  const contextContainer = parentContainer || (parent ? null : container);

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!stTitle.trim() || readOnly) return;
    setStSaving(true);
    await addWorkItem({
      title: stTitle.trim(),
      expected_date: stDate || null,
      assignee_id: item.assignee_id || null,
      status: 'Assigned',
      type: 'Subtask',
      parent_id: item.id,
    });
    if (stDate && !item.expected_date) {
      await updateWorkItem(item.id, { expected_date: stDate });
    }
    setStTitle(''); setStDate(''); setStSaving(false); setAddingSubtask(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/40 overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-surface-container-low/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
        onDoubleClick={(e) => {
          if (onViewDetail) {
            e.stopPropagation();
            onViewDetail(item);
          }
        }}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-bold text-sm text-on-surface line-clamp-2 leading-tight flex-1 select-none">{item.title}</h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {container && (
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>{container.type}</span>
            )}
            <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">event</span>
            {item.expected_date ? `Due: ${fmtDate(item.expected_date)}` : 'No deadline'}
          </span>
          {item.priority && (
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
              item.priority === 'Critical' ? 'bg-red-100 text-red-700' :
              item.priority === 'High'     ? 'bg-orange-100 text-orange-700' :
              'bg-surface-container text-on-surface-variant'
            }`}>{item.priority}</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-container-high bg-surface-container-low/30 px-4 py-3 flex flex-col gap-2">
          {(contextContainer || parent) && (
            <div className="flex items-center gap-1.5">
              {contextContainer && (
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                  contextContainer.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>{contextContainer.type}</span>
              )}
              <span className="text-xs font-medium text-on-surface-variant line-clamp-1">
                {parent ? parent.title : contextContainer?.title}
              </span>
            </div>
          )}
          {item.description && (
            <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
          )}
          {!readOnly && (
            <div className="flex gap-2 pt-1">
              {item.status === 'Assigned' && onStart && (
                <button
                  className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  onClick={(e) => { e.stopPropagation(); onStart(item.id); }}
                >
                  START
                </button>
              )}
              {item.status === 'Ongoing' && onComplete && (
                <button
                  className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  onClick={(e) => { e.stopPropagation(); onComplete(item); }}
                >
                  COMPLETE
                </button>
              )}
            </div>
          )}
          {!readOnly && item.type === 'Task' && item.status !== 'Completed' && (
            <div className="border-t border-surface-container-high pt-2 mt-1" onClick={e => e.stopPropagation()}>
              {!addingSubtask ? (
                <button
                  className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  onClick={() => setAddingSubtask(true)}
                >
                  <span className="material-symbols-outlined text-[13px]">add_circle</span> Add Subtask
                </button>
              ) : (
                <form onSubmit={handleAddSubtask} className="flex flex-col gap-1.5">
                  <input
                    autoFocus required
                    className="border border-outline-variant/50 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                    placeholder="Subtask title…"
                    value={stTitle} onChange={e => setStTitle(e.target.value)}
                  />
                  <input
                    type="date"
                    className="border border-outline-variant/50 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                    value={stDate} onChange={e => setStDate(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    <button type="submit" disabled={stSaving || !stTitle.trim()} className="flex-1 py-1 text-[11px] font-bold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                      {stSaving ? '…' : 'Add'}
                    </button>
                    <button type="button" onClick={() => { setAddingSubtask(false); setStTitle(''); setStDate(''); }} className="flex-1 py-1 text-[11px] font-bold border border-outline-variant/40 text-on-surface-variant rounded-lg hover:bg-surface-container">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {!expanded && !readOnly && (
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {item.status === 'Assigned' && onStart && (
              <button
                className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onStart(item.id); }}
              >
                START
              </button>
            )}
            {item.status === 'Ongoing' && onComplete && (
              <button
                className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onComplete(item); }}
              >
                COMPLETE
              </button>
            )}
            {item.status !== 'Assigned' && item.status !== 'Ongoing' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline px-2 py-1 bg-surface-container rounded-md">
                {item.status}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MainDashboard() {
  const { 
    currentUser, profiles, workItems, containers, absences, 
    staffGroup, getUnreadNotifications, markNotificationRead, getActiveAnnouncements,
    startWorkItem, completeWorkItem 
  } = useDataContext();

  const [pendingCompleteItem, setPendingCompleteItem] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [viewMode, setViewMode] = useState('mine'); // 'mine' | 'assistants'

  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];
  const safeAbsences = absences || [];
  const unreadNotifs = getUnreadNotifications() || [];
  const activeAnnouncements = (getActiveAnnouncements?.() || []).filter(a => a.staff_group === 'Both' || a.staff_group === currentUser?.category);

  const highlightItems = [
    ...unreadNotifs.map(n => ({ type: 'notif', id: `n_${n.id}`, message: n.message, original: n })),
    ...activeAnnouncements.map(a => ({ type: 'announcement', id: `a_${a.id}`, title: a.type === 'Text' ? 'Announcement' : a.title, message: a.type === 'Text' ? a.message : '', date: a.event_date, time: a.event_time, original: a }))
  ];

  const [highlightIdx, setHighlightIdx] = useState(0);

  useEffect(() => {
    if (highlightItems.length <= 1) return;
    const interval = setInterval(() => {
      setHighlightIdx(prev => (prev + 1) % highlightItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [highlightItems.length]);

  const isAdmin = currentUser?.role === 'Admin';
  const assistants = safeProfiles.filter(p => p.manager === currentUser?.name);
  const isManager = assistants.length > 0;

  const today = new Date().toISOString().split('T')[0];

  const isAbsentToday = safeAbsences.some(
    a => a.user_id === currentUser?.id && today >= a.from_date && today <= a.to_date
  );
  const todayAbsence = safeAbsences.find(
    a => a.user_id === currentUser?.id && today >= a.from_date && today <= a.to_date
  );

  const getTargetUserIds = () => {
    if (isAdmin) {
      return new Set(safeProfiles.filter(p => p.role !== 'Admin' && (p.category || 'Office Staff') === staffGroup).map(p => p.id));
    }
    if (isManager && viewMode === 'assistants') {
      return new Set(assistants.map(p => p.id));
    }
    return new Set([currentUser?.id]);
  };

  const targetUserIds = getTargetUserIds();
  const readOnly = isAdmin || (isManager && viewMode === 'assistants');

  // All actionable items for the targeted users
  const actionableItems = getActionableUnits(safeWorkItems).filter(w => !w.assignee_id || targetUserIds.has(w.assignee_id));

  // If viewing my own dashboard and marked absent, typically we clear Overdue/Not Started.
  // But if Admin or viewing assistants, we still show them.
  const shouldHideAlertsDueToAbsence = !readOnly && isAbsentToday;

  const getAssigneeName = (id) => safeProfiles.find(p => p.id === id)?.name || 'Unassigned';

  // 1. OVERDUE ALERT
  const overdueItems = shouldHideAlertsDueToAbsence ? [] : actionableItems.filter(w => 
    isOverdue(w) && w.status !== 'Completed' && !isItemExcludedByAbsence(w, safeAbsences)
  );

  // 2. NOT STARTED ALERT
  const notStartedItems = shouldHideAlertsDueToAbsence ? [] : actionableItems.filter(w => {
    if (getDisplayStatus(w) !== 'Not Started') return false;
    if (isItemExcludedByAbsence(w, safeAbsences)) return false;
    if (isOverdue(w)) return false; 
    if (!w.expected_date) return false; 

    const expectedDate = new Date(w.expected_date + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffDays = Math.ceil((expectedDate - todayDate) / (1000 * 60 * 60 * 24));
    
    if (w.type === 'Checklist') {
      return diffDays === 0;
    } else {
      return diffDays === 0 || diffDays === 1;
    }
  });

  const groupByAssignee = (items) => {
    const map = {};
    items.forEach(w => {
      const name = getAssigneeName(w.assignee_id);
      if (!map[name]) map[name] = { count: 0, items: [] };
      map[name].count += 1;
      map[name].items.push(w);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  };

  const overdueByAssignee = groupByAssignee(overdueItems);
  const notStartedByAssignee = groupByAssignee(notStartedItems);

  // 3. TODAY FOCUS
  const todayFocusItems = actionableItems.filter(w => {
    if (w.status === 'Completed') return false;
    if (isOverdue(w)) return false;
    if (!w.expected_date) return false;
    const expectedDate = new Date(w.expected_date + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffDays = Math.ceil((expectedDate - todayDate) / (1000 * 60 * 60 * 24));
    return diffDays === 0;
  });

  const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, undefined: 0, null: 0 };
  const sortItems = (items) => [...items].sort((a, b) => {
    const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    // Recently assigned sorting fallback
    return (b.created_at || 'z').localeCompare(a.created_at || 'z');
  });

  const ongoingFocus = sortItems(todayFocusItems.filter(w => w.status === 'Ongoing'));
  const assignedFocus = sortItems(todayFocusItems.filter(w => w.status === 'Assigned'));

  // 4. RECENT ACTIVITY
  const recentActivity = [...actionableItems]
    .filter(w => w.status === 'Completed' || w.status === 'Ongoing' || w.status === 'Assigned')
    .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
    .slice(0, 15)
    .map(w => ({
      id: w.id,
      title: w.title,
      assigneeName: getAssigneeName(w.assignee_id),
      action: w.status === 'Completed' ? 'completed' : w.status === 'Ongoing' ? 'started' : 'assigned',
      time: w.updated_at ? new Date(w.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    }));

  const handleDashComplete = async ({ note, tag }) => {
    if (!pendingCompleteItem) return;
    await completeWorkItem(pendingCompleteItem.id, { note, tag });
    setPendingCompleteItem(null);
  };

  const cardProps = { containers: safeContainers, workItems: safeWorkItems, onViewDetail: setSelectedItemDetail, readOnly };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 animate-fade-in">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">
            {isAdmin ? 'System Overview' : `Welcome back, ${currentUser?.name || 'User'}`}
          </h1>
          {!isAdmin && currentUser?.position && (
            <p className="text-sm text-primary font-semibold mt-0.5">{currentUser.position}</p>
          )}
          {isAdmin && (
            <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Live view · updates in real time</p>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && <FilterBar showToggle={true} showDateFilter={false} />}
          
          {isManager && !isAdmin && (
            <div className="flex bg-surface-container p-1 rounded-xl gap-0.5">
              <button
                onClick={() => setViewMode('mine')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'mine' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                My Work
              </button>
              <button
                onClick={() => setViewMode('assistants')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'assistants' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Assistants
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Absent Banner (For Assignee) */}
      {!isAdmin && viewMode === 'mine' && isAbsentToday && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 rounded-l-xl"></div>
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
            <span className="material-symbols-outlined text-purple-600" style={{fontVariationSettings:"'FILL' 1"}}>event_busy</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-purple-800">You are marked absent today</p>
            {todayAbsence?.reason && (
              <p className="text-xs text-purple-600 mt-0.5">{todayAbsence.reason}</p>
            )}
            {todayAbsence?.to_date && todayAbsence.to_date !== todayAbsence.from_date && (
              <p className="text-xs text-purple-500 mt-0.5">Until {fmtDate(todayAbsence.to_date)}</p>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 bg-purple-100 px-2.5 py-1 rounded-full ml-2">Absent</span>
        </div>
      )}

      {/* Notifications & Announcements Highlights */}
      {!isAdmin && viewMode === 'mine' && highlightItems.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center relative overflow-hidden h-16 transition-all duration-500">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
          
          <div className="flex items-center gap-3 ml-2 flex-1 min-w-0 animate-fade-in" key={highlightIdx}>
            {highlightItems[highlightIdx]?.type === 'notif' ? (
              <>
                <span className="material-symbols-outlined text-primary flex-shrink-0">notifications_active</span>
                <span className="text-sm font-medium text-on-surface truncate">{highlightItems[highlightIdx].message}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-indigo-600 flex-shrink-0">campaign</span>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-indigo-900 truncate">{highlightItems[highlightIdx]?.title}</span>
                    {highlightItems[highlightIdx]?.date && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 whitespace-nowrap">
                        {fmtDate(highlightItems[highlightIdx].date)} {highlightItems[highlightIdx].time ? highlightItems[highlightIdx].time : ''}
                      </span>
                    )}
                  </div>
                  {highlightItems[highlightIdx]?.message && (
                    <span className="text-xs text-indigo-800 truncate">{highlightItems[highlightIdx].message}</span>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 pl-2">
            {highlightItems.length > 1 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {highlightIdx + 1} / {highlightItems.length}
              </span>
            )}
            {highlightItems[highlightIdx]?.type === 'notif' && (
              <button
                className="px-3 py-1.5 bg-white text-primary text-xs font-bold rounded flex items-center gap-1 shadow-sm border border-outline-variant/30 hover:bg-surface-container transition-colors"
                onClick={() => {
                  if (window.confirm('Are you sure you want to dismiss this notification?')) {
                    markNotificationRead(highlightItems[highlightIdx].original.id);
                    setHighlightIdx(prev => prev >= highlightItems.length - 1 ? 0 : prev);
                  }
                }}
              >
                <span className="material-symbols-outlined text-[14px]">done</span> Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. & 2. ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Overdue Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-error/20 p-5 flex flex-col relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
          <div className="flex items-center justify-between mb-4 ml-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error" style={{fontVariationSettings: "'FILL' 1"}}>crisis_alert</span>
              <h3 className="font-bold uppercase text-xs tracking-widest text-error">Overdue Alert</h3>
            </div>
            <span className="px-2 py-0.5 font-extrabold text-xs rounded bg-error/10 text-error">{overdueItems.length}</span>
          </div>
          <div className="ml-2 flex flex-col gap-3 flex-1 overflow-y-auto max-h-80 pr-1">
            {overdueByAssignee.map(([assignee, group]) => (
              <div key={assignee} className="flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">person</span>{assignee}
                  </span>
                  <span className="text-[10px] font-black text-error bg-red-50 px-2 py-0.5 rounded-full">{group.count} items</span>
                </div>
                {group.items.map(w => (
                  <WorkItemCard key={w.id} item={w} {...cardProps} onStart={!readOnly ? startWorkItem : undefined} onComplete={!readOnly ? setPendingCompleteItem : undefined} />
                ))}
              </div>
            ))}
            {overdueItems.length === 0 && <span className="text-sm font-medium text-slate-400 mt-2">Zero overdue items. Great work!</span>}
          </div>
        </div>

        {/* Not Started Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-700/20 p-5 flex flex-col relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-700"></div>
          <div className="flex items-center justify-between mb-4 ml-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-700" style={{fontVariationSettings: "'FILL' 1"}}>schedule</span>
              <h3 className="font-bold uppercase text-xs tracking-widest text-orange-700">Not Started Alert</h3>
            </div>
            <span className="px-2 py-0.5 font-extrabold text-xs rounded bg-orange-700/10 text-orange-700">{notStartedItems.length}</span>
          </div>
          <div className="ml-2 flex flex-col gap-3 flex-1 overflow-y-auto max-h-80 pr-1">
            {notStartedByAssignee.map(([assignee, group]) => (
              <div key={assignee} className="flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">person</span>{assignee}
                  </span>
                  <span className="text-[10px] font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">{group.count} items</span>
                </div>
                {group.items.map(w => (
                  <WorkItemCard key={w.id} item={w} {...cardProps} onStart={!readOnly ? startWorkItem : undefined} onComplete={!readOnly ? setPendingCompleteItem : undefined} />
                ))}
              </div>
            ))}
            {notStartedItems.length === 0 && <span className="text-sm font-medium text-slate-400 mt-2">All actionable items are ongoing.</span>}
          </div>
        </div>

      </div>

      {/* 3. TODAY FOCUS */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30">
        <div className="p-5 border-b border-surface-container-high flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">view_kanban</span>
          <h2 className="font-bold text-base font-headline text-on-surface">Today Focus</h2>
          <p className="text-xs text-on-surface-variant ml-1">— active work due today</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-surface-container-lowest">
          
          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 min-h-[280px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline flex justify-between items-center px-1">
              Ongoing
              <span className="bg-white border border-outline-variant/50 text-on-surface-variant rounded-full text-[10px] px-2 py-0.5">{ongoingFocus.length}</span>
            </h3>
            {ongoingFocus.map(w => (
              <WorkItemCard key={w.id} item={w} {...cardProps} onComplete={!readOnly ? setPendingCompleteItem : undefined} />
            ))}
            {ongoingFocus.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-outline-variant/40 rounded-lg text-outline text-xs font-medium">No ongoing tasks.</div>
            )}
          </div>
          
          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 min-h-[280px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline flex justify-between items-center px-1">
              Assigned / New
              <span className="bg-white border border-outline-variant/50 text-on-surface-variant rounded-full text-[10px] px-2 py-0.5">{assignedFocus.length}</span>
            </h3>
            {assignedFocus.map(w => (
              <WorkItemCard key={w.id} item={w} {...cardProps} onStart={!readOnly ? startWorkItem : undefined} />
            ))}
            {assignedFocus.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-outline-variant/40 rounded-lg text-outline text-xs font-medium">No new assignments.</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30">
        <div className="p-5 border-b border-surface-container-high flex items-center gap-2">
          <span className="material-symbols-outlined text-green-600">history</span>
          <h2 className="font-bold text-base font-headline text-on-surface">Recent Activity</h2>
          <p className="text-xs text-on-surface-variant ml-1">— latest operational feed</p>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {recentActivity.length === 0 && <p className="text-sm text-on-surface-variant italic py-2">No recent activity.</p>}
          {recentActivity.map(act => (
            <div key={act.id + act.action} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                act.action === 'completed' ? 'bg-green-100 text-green-600' : 
                act.action === 'started' ? 'bg-blue-100 text-blue-600' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>
                  {act.action === 'completed' ? 'check_circle' : act.action === 'started' ? 'play_circle' : 'assignment'}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-on-surface leading-snug">
                  <span className="font-bold">{act.assigneeName}</span>
                  {' '}<span className={`font-medium ${
                    act.action === 'completed' ? 'text-green-600' : 
                    act.action === 'started' ? 'text-blue-600' : 'text-on-surface-variant'
                  }`}>{act.action}</span>{' '}
                  <span className="font-medium text-on-surface-variant">{act.title}</span>
                </p>
                <p className="text-[10px] font-medium text-outline mt-0.5 uppercase tracking-wide">{act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedItemDetail && (
        <ItemDetailModal
          item={selectedItemDetail}
          containers={safeContainers}
          workItems={safeWorkItems}
          profiles={safeProfiles}
          onClose={() => setSelectedItemDetail(null)}
          onStart={!readOnly ? startWorkItem : undefined}
          onComplete={item => { if(!readOnly) { setPendingCompleteItem(item); setSelectedItemDetail(null); } }}
        />
      )}

      {pendingCompleteItem && !readOnly && (
        <CompletionPanel
          item={pendingCompleteItem}
          profiles={safeProfiles}
          currentUser={currentUser}
          onConfirm={handleDashComplete}
          onCancel={() => setPendingCompleteItem(null)}
        />
      )}

      {showAbsenceModal && (
        <AbsenceModal onClose={() => setShowAbsenceModal(false)} />
      )}
    </div>
  );
}
