import { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits, isItemExcludedByAbsence } from '../../lib/statusUtils';
import { fmtDate } from '../../lib/dateUtils';
import CompletionPanel from '../common/CompletionPanel';
import AbsenceModal from '../common/AbsenceModal';

// ─── Item detail modal (same style as staff page) ────────────────────────────
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

// ─── Expandable work item card for pipeline ───────────────────────────────────
function WorkItemCard({ item, containers, workItems, onStart, onComplete, onViewDetail }) {
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
    if (!stTitle.trim()) return;
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
      {/* Card header (always visible, click to expand) */}
      <div
        className="p-4 cursor-pointer hover:bg-surface-container-low/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-bold text-sm text-on-surface line-clamp-2 leading-tight flex-1">{item.title}</h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {container && (
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>{container.type}</span>
            )}
            {onViewDetail && (
              <button
                title="View details"
                className="text-on-surface-variant hover:text-primary transition-colors"
                onClick={e => { e.stopPropagation(); onViewDetail(item); }}
              >
                <span className="material-symbols-outlined text-[15px]">open_in_full</span>
              </button>
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

      {/* Expanded detail */}
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
          {item.type === 'Task' && item.status !== 'Completed' && (
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

      {/* Action row (non-expanded) */}
      {!expanded && (
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

// ─── Alert card (shared layout for Overdue and Not Started) ──────────────────
function AlertCard({ icon, title, accent, items, count, onAction, actionLabel, emptyMsg, cardProps, currentUser, onComplete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayItems = isExpanded ? items : items.slice(0, 3);
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 relative overflow-hidden flex flex-col ${accent.border}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bar}`}></div>
      <div className="flex items-center justify-between mb-4 ml-2">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined ${accent.icon}`} style={{fontVariationSettings: "'FILL' 1"}}>{icon}</span>
          <h3 className={`font-bold uppercase text-xs tracking-widest ${accent.title}`}>{title}</h3>
        </div>
        <span className={`px-2 py-0.5 font-extrabold text-xs rounded ${accent.badge}`}>{count}</span>
      </div>
      <div className="ml-2 flex flex-col gap-3 flex-1">
        {displayItems.map(w => (
          <WorkItemCard
            key={w.id}
            item={w}
            {...cardProps}
            onStart={currentUser?.role !== 'Admin' ? onAction : null}
            onComplete={onComplete}
          />
        ))}
        {items.length === 0 && <span className="text-sm font-medium text-slate-400 mt-2">{emptyMsg}</span>}
        
        {items.length > 3 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-outline uppercase font-bold mt-2 text-center hover:text-on-surface-variant transition-colors py-1"
          >
            {isExpanded ? 'SHOW LESS' : `+${items.length - 3} MORE`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AssigneeDashboard() {
  const { currentUser, workItems, containers, profiles, absences, startWorkItem, completeWorkItem, getUnreadNotifications, markNotificationRead } = useDataContext();
  const [pendingCompleteItem, setPendingCompleteItem] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  const handleDashComplete = async ({ note, tag }) => {
    if (!pendingCompleteItem) return;
    await completeWorkItem(pendingCompleteItem.id, { note, tag });
    setPendingCompleteItem(null);
  };

  const safeWorkItems  = workItems   || [];
  const safeContainers = containers  || [];
  const safeAbsences   = absences    || [];
  const unreadNotifs   = getUnreadNotifications() || [];

  const today = new Date().toISOString().split('T')[0];
  const isAbsentToday = safeAbsences.some(
    a => a.user_id === currentUser.id && today >= a.from_date && today <= a.to_date
  );
  const todayAbsence = safeAbsences.find(
    a => a.user_id === currentUser.id && today >= a.from_date && today <= a.to_date
  );

  const myItemsAll   = safeWorkItems.filter(w => w.assignee_id === currentUser.id);
  const myItems      = getActionableUnits(myItemsAll);

  const overdueItems    = isAbsentToday ? [] : myItems.filter(w => isOverdue(w) && w.status !== 'Completed' && !isItemExcludedByAbsence(w, safeAbsences));
  const notStartedItems = isAbsentToday ? [] : myItems.filter(w => getDisplayStatus(w) === 'Not Started' && !isItemExcludedByAbsence(w, safeAbsences));
  const completedItems  = myItems.filter(w => w.status === 'Completed').slice(0, 5);

  const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, undefined: 0, null: 0 };

  // Today's Focus: leaf-only items (no parent tasks with children), exclude overdue/not-started
  const assignedItems = myItems.filter(w => getDisplayStatus(w) === 'Assigned')
                               .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
  const ongoingItems  = myItems.filter(w => w.status === 'Ongoing')
                               .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

  const cardProps = { containers: safeContainers, workItems: safeWorkItems, onViewDetail: setSelectedItemDetail };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">
            Welcome back, {currentUser.name || 'User'}
          </h1>
          {currentUser.position && (
            <p className="text-sm text-primary font-semibold mt-0.5">{currentUser.position}</p>
          )}
        </div>
      </div>

      {/* Absent Today Banner */}
      {isAbsentToday && (
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

      {/* Notifications Banner */}
      {unreadNotifs.length > 0 && (
        <div className="flex flex-col gap-2">
          {unreadNotifs.slice(0, 3).map(n => (
            <div key={n.id} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              <div className="flex items-center gap-3 ml-2">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
                <span className="text-sm font-medium text-on-surface">{n.message}</span>
              </div>
              <button
                className="px-4 py-1.5 bg-white text-primary text-xs font-bold rounded flex items-center gap-1 shadow-sm border border-outline-variant/30 hover:bg-surface-container transition-colors"
                onClick={() => {
                  if (window.confirm('Are you sure you want to dismiss this notification?')) {
                    markNotificationRead(n.id);
                  }
                }}
              >
                <span className="material-symbols-outlined text-[14px]">done</span> Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Alert cards — Overdue + Not Started, same layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AlertCard
          icon="crisis_alert"
          title="Immediate Action — Overdue"
          accent={{
            border: 'border-error/20',
            bar:    'bg-error',
            icon:   'text-error',
            title:  'text-error',
            badge:  'bg-error/10 text-error',
            btn:    'bg-error text-white',
          }}
          items={overdueItems}
          count={overdueItems.length}
          onAction={currentUser?.role !== 'Admin' ? startWorkItem : undefined}
          onComplete={setPendingCompleteItem}
          actionLabel="START"
          emptyMsg="Zero overdue items. Great work!"
          cardProps={cardProps}
          currentUser={currentUser}
        />
        <AlertCard
          icon="schedule"
          title="Not Started"
          accent={{
            border: 'border-orange-700/20',
            bar:    'bg-orange-700',
            icon:   'text-orange-700',
            title:  'text-orange-700',
            badge:  'bg-orange-700/10 text-orange-700',
            btn:    'bg-orange-700 text-white',
          }}
          items={notStartedItems}
          count={notStartedItems.length}
          onAction={currentUser?.role !== 'Admin' ? startWorkItem : undefined}
          onComplete={setPendingCompleteItem}
          actionLabel="START"
          emptyMsg="All assigned items are ongoing."
          cardProps={cardProps}
          currentUser={currentUser}
        />
      </div>

      {/* Today's Focus */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30">
        <div className="p-5 border-b border-surface-container-high flex items-center gap-2">
          <span className="material-symbols-outlined">view_kanban</span>
          <h2 className="font-bold text-base font-headline text-on-surface">Today's Focus</h2>
          <p className="text-xs text-on-surface-variant ml-1">— click any card to expand details</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-surface-container-lowest">
          {/* Ongoing — shown first */}
          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 min-h-[280px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline flex justify-between items-center px-1">
              Ongoing Activity
              <span className="bg-white border border-outline-variant/50 text-on-surface-variant rounded-full text-[10px] px-2 py-0.5">{ongoingItems.length}</span>
            </h3>
            {ongoingItems.map(w => (
              <WorkItemCard key={w.id} item={w} {...cardProps} onComplete={(item) => setPendingCompleteItem(item)} />
            ))}
            {ongoingItems.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-outline-variant/40 rounded-lg text-outline text-xs font-medium">No ongoing tasks.</div>
            )}
          </div>
          {/* Assigned */}
          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 min-h-[280px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline flex justify-between items-center px-1">
              New / Assigned
              <span className="bg-white border border-outline-variant/50 text-on-surface-variant rounded-full text-[10px] px-2 py-0.5">{assignedItems.length}</span>
            </h3>
            {assignedItems.map(w => (
              <WorkItemCard key={w.id} item={w} {...cardProps} onStart={currentUser?.role !== 'Admin' ? startWorkItem : null} />
            ))}
            {assignedItems.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-outline-variant/40 rounded-lg text-outline text-xs font-medium">No new assignments.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent completions */}
      {completedItems.length > 0 && (
        <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden">
          <div className="p-5 border-b border-surface-container-high">
            <h2 className="font-bold text-base font-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">history</span> Recent Completions
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {completedItems.map(w => (
              <div key={w.id} className="flex gap-3 items-center">
                <span className="material-symbols-outlined text-green-600 text-xl shrink-0">check_circle</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-semibold text-on-surface line-clamp-1">{w.title}</span>
                  <span className="text-[10px] text-outline uppercase font-bold tracking-wider">Done</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedItemDetail && (
        <ItemDetailModal
          item={selectedItemDetail}
          containers={safeContainers}
          workItems={safeWorkItems}
          profiles={profiles || []}
          onClose={() => setSelectedItemDetail(null)}
          onStart={currentUser?.role !== 'Admin' ? startWorkItem : null}
          onComplete={item => { setPendingCompleteItem(item); setSelectedItemDetail(null); }}
        />
      )}

      {pendingCompleteItem && (
        <CompletionPanel
          item={pendingCompleteItem}
          profiles={profiles || []}
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
