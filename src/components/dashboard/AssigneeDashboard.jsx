import React, { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits } from '../../lib/statusUtils';

// ─── Expandable work item card for pipeline ───────────────────────────────────
function WorkItemCard({ item, containers, workItems, showStart = false, showComplete = false, onStart, onComplete }) {
  const { addWorkItem, updateWorkItem } = useDataContext();
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [stTitle, setStTitle] = useState('');
  const [stDate, setStDate]   = useState('');
  const [stSaving, setStSaving] = useState(false);

  const container = item.container_id ? (containers || []).find(c => c.id === item.container_id) : null;
  const parentItem = item.parent_id   ? (workItems  || []).find(w => w.id === item.parent_id)   : null;

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
            <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">event</span>
            {item.expected_date ? `Due: ${item.expected_date}` : 'No deadline'}
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
          {container && (
            <div className="text-xs text-on-surface-variant">
              <span className="font-bold text-on-surface">{container.type}:</span> {container.title}
              {container.description && <p className="mt-0.5 text-on-surface-variant/70 line-clamp-2">{container.description}</p>}
            </div>
          )}
          {parentItem && (
            <p className="text-xs text-on-surface-variant">
              <span className="font-bold">Parent:</span> {parentItem.title}
            </p>
          )}
          {item.description && (
            <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
          )}
          <div className="flex gap-2 pt-1">
            {showStart && (
              <button
                className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onStart(item.id); }}
              >
                START
              </button>
            )}
            {showComplete && (
              <button
                className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onComplete(item.id); }}
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
            {showStart && (
              <button
                className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onStart(item.id); }}
              >
                START
              </button>
            )}
            {showComplete && (
              <button
                className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onComplete(item.id); }}
              >
                COMPLETE
              </button>
            )}
            {!showStart && !showComplete && (
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
function AlertCard({ icon, title, accent, items, count, onAction, actionLabel, emptyMsg }) {
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
      <div className="ml-2 flex flex-col gap-2 flex-1">
        {items.slice(0, 3).map(w => (
          <div key={w.id} className="flex justify-between items-center border-b border-surface-container pb-2 last:border-0 last:pb-0">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-sm font-semibold text-on-surface truncate block">{w.title}</span>
              {w.expected_date && <span className="text-[10px] text-on-surface-variant">{w.expected_date}</span>}
            </div>
            {onAction && (
              <button className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${accent.btn}`} onClick={() => onAction(w.id)}>
                {actionLabel}
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <span className="text-sm font-medium text-slate-400 mt-2">{emptyMsg}</span>}
        {items.length > 3 && <span className="text-[10px] text-outline uppercase font-bold mt-2 text-center">+{items.length - 3} MORE</span>}
      </div>
    </div>
  );
}

export default function AssigneeDashboard() {
  const { currentUser, workItems, containers, startWorkItem, completeWorkItem, getUnreadNotifications, markNotificationRead } = useDataContext();

  const safeWorkItems = workItems   || [];
  const safeContainers = containers || [];
  const unreadNotifs  = getUnreadNotifications() || [];

  const myItemsAll   = safeWorkItems.filter(w => w.assignee_id === currentUser.id && !w.is_recurring);
  const myItems      = getActionableUnits(myItemsAll);

  const overdueItems    = myItems.filter(w => isOverdue(w) && w.status !== 'Completed');
  const notStartedItems = myItems.filter(w => getDisplayStatus(w) === 'Not Started');
  const assignedItems   = myItems.filter(w => w.status === 'Assigned');
  const ongoingItems    = myItems.filter(w => w.status === 'Ongoing');
  const completedItems  = myItems.filter(w => w.status === 'Completed').slice(0, 5);

  const cardProps = { containers: safeContainers, workItems: safeWorkItems };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">
          Welcome back, {currentUser.name || 'User'}
        </h1>
        {currentUser.position && (
          <p className="text-sm text-primary font-semibold mt-0.5">{currentUser.position}</p>
        )}
      </div>

      {/* Notifications Banner */}
      {unreadNotifs.length > 0 && (
        <div className="flex flex-col gap-2">
          {unreadNotifs.map(n => (
            <div key={n.id} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              <div className="flex items-center gap-3 ml-2">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
                <span className="text-sm font-medium text-on-surface">{n.message}</span>
              </div>
              <button
                className="px-4 py-1.5 bg-white text-primary text-xs font-bold rounded flex items-center gap-1 shadow-sm border border-outline-variant/30 hover:bg-surface-container transition-colors"
                onClick={() => markNotificationRead(n.id)}
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
          onAction={startWorkItem}
          actionLabel="START"
          emptyMsg="Zero overdue items. Great work!"
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
          onAction={startWorkItem}
          actionLabel="START"
          emptyMsg="All assigned items are ongoing."
        />
      </div>

      {/* Work Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30">
        <div className="p-5 border-b border-surface-container-high flex items-center gap-2">
          <span className="material-symbols-outlined">view_kanban</span>
          <h2 className="font-bold text-base font-headline text-on-surface">Work Pipeline</h2>
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
              <WorkItemCard key={w.id} item={w} {...cardProps} showComplete onComplete={completeWorkItem} />
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
              <WorkItemCard key={w.id} item={w} {...cardProps} showStart onStart={startWorkItem} />
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

    </div>
  );
}
