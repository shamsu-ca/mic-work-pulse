import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits, isNotStarted } from '../../lib/statusUtils';
import { fmtDate } from '../../lib/dateUtils';
import CompletionPanel from '../common/CompletionPanel';
import AbsenceModal from '../common/AbsenceModal';
import FilterBar from '../common/FilterBar';
import FollowUpModal from '../common/FollowUpModal';

// ─── Item detail modal ────────────────────────────
function ItemDetailModal({ item, containers, workItems, profiles, onClose, onStart, onComplete, isAdmin, onEdit, onDelete }) {
  const { currentUser } = useDataContext();
  const showControls = item.assignee_id === currentUser?.id;
  const container = item.container_id ? containers.find(c => c.id === item.container_id) : null;
  const parent    = item.parent_id    ? workItems.find(w => w.id === item.parent_id)     : null;
  const assignee  = item.assignee_id  ? profiles.find(p => p.id === item.assignee_id)    : null;
  const status    = getDisplayStatus(item);
  const followUps = workItems.filter(w => w.linked_to === item.id);
  const sourceItem = item.linked_to   ? workItems.find(w => w.id === item.linked_to)     : null;

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

  const renderRow = (label, value) => value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-container last:border-0">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-on-surface font-medium flex-1">{value}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${typeColors[item.type] || 'bg-surface-container text-on-surface-variant'}`}>{item.type || 'Task'}</span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusColors[status] || ''}`}>{status}</span>
            </div>
            {sourceItem && (
              <p className="text-[10px] text-indigo-700 font-semibold mb-1">Follow-up of: {sourceItem.title}</p>
            )}
            <h2 className="font-bold text-base text-on-surface leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="px-6 py-2 overflow-y-auto max-h-[60vh]">
          {renderRow("Due Date", item.expected_date ? fmtDate(item.expected_date) : 'No date set')}
          {assignee  && renderRow("Assignee", assignee.name)}
          {container && renderRow(container.type, container.title)}
          {parent    && renderRow("Parent", parent.title)}
          {item.priority && renderRow("Priority", item.priority)}
          {item.description && renderRow("Description", item.description)}
          {item.status === 'Completed' && item.completion_note && (
            <div className="py-2.5 border-b border-surface-container">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Completion Note</span>
              <p className="text-sm text-on-surface font-medium bg-green-50 border border-green-100 rounded-xl px-3 py-2">{item.completion_note}</p>
            </div>
          )}
          {item.completion_tag && renderRow("Tag", item.completion_tag)}
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
        <div className="px-6 py-3 border-t border-surface-container flex flex-wrap gap-2">
          {showControls && item.status === 'Assigned' && onStart && (
            <button
              className="flex-1 min-w-[80px] py-2 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              onClick={() => { onStart(item.id); onClose(); }}
            >START</button>
          )}
          {showControls && item.status === 'Ongoing' && onComplete && (
            <button
              className="flex-1 min-w-[80px] py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              onClick={() => { onComplete(item); onClose(); }}
            >COMPLETE</button>
          )}
          {isAdmin && onEdit && (
            <button
              className="flex-1 min-w-[80px] py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1"
              onClick={() => { onEdit(item); onClose(); }}
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>Edit
            </button>
          )}
          {isAdmin && onDelete && (
            <button
              className="flex-1 min-w-[80px] py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-1"
              onClick={() => { if (window.confirm("Are you sure you want to delete this item?")) { onDelete(item.id); onClose(); } }}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>Delete
            </button>
          )}
          <button className="flex-1 min-w-[80px] py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors border border-outline-variant/30" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Expandable work item card ───────────────────────────────────
function WorkItemCard({ item, containers, workItems, onStart, onComplete, onViewDetail, readOnly, isAdmin, isTodayFocus, profiles, onFollowUp }) {
  const { currentUser } = useDataContext();
  const showControls = item.assignee_id === currentUser?.id;
  const [expanded, setExpanded] = useState(false);

  const container = item.container_id ? (containers || []).find(c => c.id === item.container_id) : null;
  const parent    = item.parent_id    ? (workItems  || []).find(w => w.id === item.parent_id)    : null;
  const parentContainer = parent?.container_id ? (containers || []).find(c => c.id === parent.container_id) : null;
  const contextContainer = parentContainer || (parent ? null : container);
  const followUps = (workItems || []).filter(w => w.linked_to === item.id);
  const assignee = item.assignee_id ? (profiles || []).find(p => p.id === item.assignee_id) : null;

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
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border truncate max-w-[120px] ${
                container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`} title={container.title}>{container.title}</span>
            )}
            <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && isTodayFocus ? (
            <>
              {assignee && (
                <span className="text-xs text-on-surface-variant flex items-center gap-1 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[12px] text-slate-400">person</span>
                  {assignee.name}
                </span>
              )}
              {container && (
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border truncate max-w-[120px] ${
                  container.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`} title={container.title}>{container.title}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">event</span>
              {item.expected_date ? fmtDate(item.expected_date) : 'No deadline'}
            </span>
          )}
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
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border truncate max-w-[120px] ${
                  contextContainer.type === 'Project' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`} title={contextContainer.title}>{contextContainer.title}</span>
              )}
              <span className="text-xs font-medium text-on-surface-variant line-clamp-1">
                {parent ? parent.title : contextContainer?.title}
              </span>
            </div>
          )}
          {item.description && (
            <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
          )}

          {/* Linked Follow-up tasks/milestones list */}
          {followUps.length > 0 && (
            <div className="mt-1 pt-1 border-t border-surface-container-high">
              <span className="text-[9px] font-bold uppercase tracking-wider text-outline block mb-1">Follow-ups</span>
              <div className="flex flex-col gap-1">
                {followUps.map(f => (
                  <div key={f.id} className="text-xs font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[12px] text-primary">subdirectory_arrow_right</span>
                    <span className="flex-1 truncate">{f.title}</span>
                    <span className="text-[10px] text-outline">({f.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showControls && (
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

          {isAdmin && onFollowUp && (
            <div className="flex justify-end pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onFollowUp(item); }}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded transition-all"
              >
                <span className="material-symbols-outlined text-[12px]">reply</span>Create Follow-up
              </button>
            </div>
          )}
        </div>
      )}

      {!expanded && (
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {showControls && item.status === 'Assigned' && onStart && (
              <button
                className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onStart(item.id); }}
              >
                START
              </button>
            )}
            {showControls && item.status === 'Ongoing' && onComplete && (
              <button
                className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:opacity-90 active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); onComplete(item); }}
              >
                COMPLETE
              </button>
            )}
            {!showControls && (
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

function DashboardDetailModal({ data, containers, workItems, profiles, currentUser, onClose, onStart, onComplete, onFollowUp, onViewDetail }) {
  const [collapsedAssignees, setCollapsedAssignees] = useState({});
  if (!data) return null;
  const isOverdue = data.type === 'Overdue';

  const grouped = data.items.reduce((acc, item) => {
    const name = profiles.find(p => p.id === item.assignee_id)?.name || 'Unassigned';
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {});

  const isAdmin = currentUser?.role === 'Admin';

  const toggleAssignee = (name) => {
    const currentlyCollapsed = collapsedAssignees[name] !== undefined ? collapsedAssignees[name] : isAdmin;
    setCollapsedAssignees(prev => ({ ...prev, [name]: !currentlyCollapsed }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[950] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-container ${isOverdue ? 'bg-red-50/50' : 'bg-orange-50/50'}`}>
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined ${isOverdue ? 'text-error' : 'text-orange-700'}`}>
              {isOverdue ? 'crisis_alert' : 'pending_actions'}
            </span>
            <h2 className="font-bold text-sm sm:text-base text-on-surface">{data.title}</h2>
            <span className={`px-2 py-0.5 text-xs font-extrabold rounded-full ${isOverdue ? 'bg-error/10 text-error' : 'bg-orange-700/10 text-orange-700'}`}>
              {data.items.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 sm:gap-5 flex-1">
          {Object.entries(grouped).map(([assigneeName, groupItems]) => {
            const isCollapsed = collapsedAssignees[assigneeName] !== undefined ? collapsedAssignees[assigneeName] : isAdmin;
            return (
              <div key={assigneeName} className="flex flex-col gap-2.5">
                <div 
                  onClick={() => toggleAssignee(assigneeName)}
                  className="flex items-center gap-2 border-b pb-1.5 border-slate-100 cursor-pointer select-none hover:bg-slate-50 p-1 rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-150">
                    {isCollapsed ? 'chevron_right' : 'expand_more'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{assigneeName}</span>
                  <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${
                    isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                  }`}>
                    {groupItems.length}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col gap-2">
                    {groupItems.map(item => {
                      return (
                        <div key={item.id} className="relative group border border-outline-variant/20 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                          <WorkItemCard
                            item={item}
                            containers={containers}
                            workItems={workItems}
                            profiles={profiles}
                            onStart={onStart}
                            onComplete={onComplete}
                            onViewDetail={onViewDetail}
                            readOnly={!isAdmin && item.assignee_id !== currentUser?.id}
                            isAdmin={isAdmin}
                            onFollowUp={onFollowUp}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 sm:px-6 py-3 border-t border-surface-container flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold bg-surface-container text-on-surface-variant rounded-xl hover:bg-surface-container-high transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpandableUrgentCard({ title, items, type, onViewAll, profiles, isAdmin }) {
  const isOverdueType = type === 'Overdue';

  const getGroupedCounts = () => {
    const map = {};
    items.forEach(w => {
      const name = profiles.find(p => p.id === w.assignee_id)?.name || 'Unassigned';
      if (!map[name]) map[name] = 0;
      map[name] += 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const grouped = getGroupedCounts();

  return (
    <div 
      onClick={onViewAll}
      className={`bg-white rounded-xl shadow-sm border flex flex-col p-3 sm:p-4 cursor-pointer select-none transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex-shrink-0 ${
        isOverdueType 
          ? 'border-red-200 bg-red-50/5 hover:border-red-300' 
          : 'border-orange-200 bg-orange-50/5 hover:border-orange-300'
      }`}
    >
      <div className="flex items-center justify-between border-b pb-2 mb-2 sm:mb-3 gap-1">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <span className={`material-symbols-outlined text-sm sm:text-base ${isOverdueType ? 'text-red-500' : 'text-orange-500'}`} style={{fontVariationSettings: "'FILL' 1"}}>
            {isOverdueType ? 'crisis_alert' : 'pending_actions'}
          </span>
          <h3 className={`font-bold text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-widest truncate ${isOverdueType ? 'text-red-700' : 'text-orange-700'}`}>
            {title}
          </h3>
        </div>
        <span className={`px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-[10px] font-black rounded-full flex-shrink-0 ${
          isOverdueType 
            ? 'bg-red-100 text-red-700 border border-red-200/50' 
            : 'bg-orange-100 text-orange-700 border border-orange-200/50'
        }`}>
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-3 sm:py-4 text-slate-400">
          <span className="material-symbols-outlined text-[18px] sm:text-[24px] opacity-40 mb-1">done_all</span>
          <span className="text-[10px] sm:text-xs font-medium">All caught up!</span>
        </div>
      ) : isAdmin ? (
        <div className="flex flex-col gap-1 max-h-24 sm:max-h-32 overflow-y-auto pr-1">
          {grouped.map(([name, count]) => (
            <div key={name} className="flex justify-between items-center text-[10px] sm:text-xs py-0.5 sm:py-1 border-b border-slate-50 last:border-0 gap-2">
              <span className="font-semibold text-slate-700 truncate">{name}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold flex-shrink-0 ${
                isOverdueType ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
              }`}>{count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 sm:py-4 text-center">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-600 leading-tight">
            You have <strong className={isOverdueType ? 'text-red-600' : 'text-orange-600'}>{items.length}</strong> {type === 'Overdue' ? 'overdue' : 'not started'} task{items.length !== 1 ? 's' : ''}.
          </span>
        </div>
      )}
    </div>
  );
}

export default function MainDashboard() {
  const { 
    currentUser, profiles, workItems, containers, leaveRequests, 
    staffGroup, getUnreadNotifications, markNotificationRead, getActiveAnnouncements,
    startWorkItem, completeWorkItem, createFollowUpTask, addWorkItem, updateWorkItem, deleteWorkItem
  } = useDataContext();

  const navigate = useNavigate();
  const [isUrgentExpanded, setIsUrgentExpanded] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const [pendingCompleteItem, setPendingCompleteItem] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [collapsedTodayFocus, setCollapsedTodayFocus] = useState({});
  const [viewMode, setViewMode] = useState('mine'); // 'mine' | 'assistants'
  const [detailModalData, setDetailModalData] = useState(null);
  const [followUpTarget, setFollowUpTarget] = useState(null);

  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];
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
  const [milestoneTarget, setMilestoneTarget] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', date: '', assignee_id: '' });
  const [isMilestoneSubmitting, setIsMilestoneSubmitting] = useState(false);

  const filteredProfiles = safeProfiles.filter(p =>
    (p.role !== 'Admin' && (p.category || 'Office Staff') === staffGroup) || p.id === currentUser?.id
  );
  const milestoneAssigneeOptions = isAdmin
    ? filteredProfiles
    : safeProfiles.filter(p => p.id === currentUser?.id || p.manager === currentUser?.name);

  const submitMilestone = async () => {
    if (!milestoneForm.title.trim() || !milestoneTarget) return;
    setIsMilestoneSubmitting(true);
    await addWorkItem({
      title: milestoneForm.title.trim(),
      type: 'Milestone',
      container_id: milestoneTarget,
      status: 'Assigned',
      created_by: currentUser?.id,
      expected_date: milestoneForm.date || null,
      assignee_id: milestoneForm.assignee_id || null,
    });
    setIsMilestoneSubmitting(false);
    setMilestoneTarget(null);
    setMilestoneForm({ title: '', date: '', assignee_id: '' });
  };

  const handleAddMilestoneClick = (projectId) => {
    const projectMilestones = getProjectMilestones(projectId);
    const sorted = [...projectMilestones].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const lastAssigneeId = sorted[0]?.assignee_id || '';
    setMilestoneForm({
      title: '',
      date: '',
      assignee_id: lastAssigneeId,
    });
    setMilestoneTarget(projectId);
  };

  const assistants = safeProfiles.filter(p => p.manager === currentUser?.name);
  const isManager = assistants.length > 0;

  const today = new Date().toISOString().split('T')[0];

  const isAbsentToday = leaveRequests?.some(
    l => l.user_id === currentUser?.id && l.status === 'Approved' && l.leave_type === 'Full Day' && today >= l.from_date && today <= l.to_date
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

  const tomorrowStr = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getProjectMilestones = (projectId) => {
    const directMilestones = safeWorkItems.filter(w => w.container_id === projectId && w.type === 'Milestone');
    const projectPhases = safeWorkItems.filter(w => w.container_id === projectId && w.type === 'Phase');
    const phaseIds = new Set(projectPhases.map(p => p.id));
    const phaseMilestones = safeWorkItems.filter(w => w.parent_id && phaseIds.has(w.parent_id) && w.type === 'Milestone');
    
    const all = [...directMilestones];
    phaseMilestones.forEach(m => {
      if (!all.some(x => x.id === m.id)) {
        all.push(m);
      }
    });
    return all;
  };

  const activeProjects = safeContainers
    .filter(c => {
      if (c.type !== 'Project' || c.is_active === false || c.status === 'Closed') return false;
      if (isAdmin) return true;
      if (c.created_by && targetUserIds.has(c.created_by)) return true;
      
      const hasTargetWorkItem = safeWorkItems.some(w => 
        w.container_id === c.id && 
        w.assignee_id && 
        targetUserIds.has(w.assignee_id)
      );
      if (hasTargetWorkItem) return true;

      const projectPhases = safeWorkItems.filter(w => w.container_id === c.id && w.type === 'Phase');
      const phaseIds = new Set(projectPhases.map(p => p.id));
      const hasPhaseTargetWorkItem = safeWorkItems.some(w => 
        w.parent_id && 
        phaseIds.has(w.parent_id) && 
        w.assignee_id && 
        targetUserIds.has(w.assignee_id)
      );
      if (hasPhaseTargetWorkItem) return true;

      return false;
    })
    .map(c => {
      const count = safeWorkItems.filter(w => w.container_id === c.id).length;
      return { ...c, count };
    })
    .sort((a, b) => b.count - a.count);

  // All actionable items for the targeted users (Tasks, Milestones, Active Checklists)
  const actionableItems = getActionableUnits(safeWorkItems).filter(w => !w.assignee_id || targetUserIds.has(w.assignee_id));

  const getAssigneeName = (id) => safeProfiles.find(p => p.id === id)?.name || 'Unassigned';

  // 1. OVERDUE ALERT
  const overdueItems = actionableItems.filter(w => 
    isOverdue(w, today, leaveRequests) && w.status !== 'Completed'
  );

  // 2. NOT STARTED ALERT
  const notStartedItems = actionableItems.filter(w => 
    isNotStarted(w, today)
  );


  // 3. TODAY FOCUS
  const todayFocusItems = actionableItems.filter(w => {
    return w.expected_date === today && w.status !== 'Completed';
  });

  const todayFocusGrouped = (() => {
    const map = {};
    todayFocusItems.forEach(w => {
      const name = getAssigneeName(w.assignee_id);
      if (!map[name]) map[name] = [];
      map[name].push(w);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  })();

  const toggleTodayFocusAssignee = (name) => {
    const currentlyCollapsed = collapsedTodayFocus[name] !== undefined ? collapsedTodayFocus[name] : isAdmin;
    setCollapsedTodayFocus(prev => ({ ...prev, [name]: !currentlyCollapsed }));
  };

  const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, undefined: 0, null: 0 };
  const sortItems = (items) => [...items].sort((a, b) => {
    const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return (b.created_at || 'z').localeCompare(a.created_at || 'z');
  });

  const ongoingFocus = sortItems(todayFocusItems.filter(w => w.status === 'Ongoing'));
  const assignedFocus = sortItems(todayFocusItems.filter(w => w.status === 'Assigned'));

  // 4. RECENT ACTIVITY
  const recentActivity = (() => {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(todayDate.getDate() - 1);
    
    const todayStr = todayDate.toDateString();
    const yesterdayStr = yesterdayDate.toDateString();

    const formatActivityTime = (dateStr) => {
      if (!dateStr) return '—';
      const date = new Date(dateStr);
      const dStr = date.toDateString();
      const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (dStr === todayStr) {
        return `Today at ${timePart}`;
      } else if (dStr === yesterdayStr) {
        return `Yesterday at ${timePart}`;
      }
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return [...actionableItems]
      .filter(w => w.status === 'Completed' || w.status === 'Ongoing' || w.status === 'Assigned')
      .filter(w => {
        const dateVal = w.updated_at || w.created_at;
        if (!dateVal) return false;
        const d = new Date(dateVal).toDateString();
        return d === todayStr || d === yesterdayStr;
      })
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
      .slice(0, 15)
      .map(w => ({
        id: w.id,
        title: w.title,
        assigneeName: getAssigneeName(w.assignee_id),
        action: w.status === 'Completed' ? 'completed' : w.status === 'Ongoing' ? 'started' : 'assigned',
        time: formatActivityTime(w.updated_at || w.created_at),
      }));
  })();

  // 5. EVENT CHECKLIST ALERTS
  // Identify incomplete checklists under phases whose expected dates have passed.
  const passedPhases = safeWorkItems.filter(w => 
    w.type === 'Phase' && 
    w.expected_date && 
    today > w.expected_date && 
    w.status !== 'Completed'
  );
  const passedPhaseIds = new Set(passedPhases.map(p => p.id));

  const passedPhaseChecklists = actionableItems.filter(w => 
    w.type === 'Checklist' && 
    w.status !== 'Completed' && 
    w.parent_id && 
    passedPhaseIds.has(w.parent_id)
  );

  const handleDashComplete = async ({ note, tag, followUp }) => {
    if (!pendingCompleteItem) return;
    await completeWorkItem(pendingCompleteItem.id, { note, tag });
    if (followUp?.title?.trim() && followUp?.dueDate) {
      const sameContainerId = pendingCompleteItem.container_id || null;
      await createFollowUpTask(pendingCompleteItem.id, {
        title: followUp.title,
        description: followUp.description,
        dueDate: followUp.dueDate,
        assigneeId: followUp.assigneeId,
        priority: followUp.priority || 'Medium',
        linkType: 'Continuation',
        type: pendingCompleteItem.type || 'Task',
        container_id: sameContainerId,
      });
    }
    setPendingCompleteItem(null);
  };

  const cardProps = { 
    containers: safeContainers, 
    workItems: safeWorkItems, 
    onViewDetail: setSelectedItemDetail, 
    readOnly,
    isAdmin,
    onFollowUp: (item) => setFollowUpTarget(item)
  };

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

      {/* Passed Phase Checklist Alerts */}
      {passedPhaseChecklists.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 rounded-l-xl"></div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 ml-2">
              <span className="material-symbols-outlined text-red-600 font-bold" style={{fontVariationSettings:"'FILL' 1"}}>warning</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-800">Event Checklist Alert</p>
              <p className="text-xs text-red-600 mt-0.5">
                There {passedPhaseChecklists.length === 1 ? 'is 1 checklist item' : `are ${passedPhaseChecklists.length} checklist items`} whose phase dates have passed but remain incomplete!
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-100 px-2.5 py-1 rounded-full ml-2">
              {passedPhaseChecklists.length} Overdue
            </span>
          </div>
          <div className="ml-11 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {passedPhaseChecklists.map(item => {
              const parentPhase = safeWorkItems.find(p => p.id === item.parent_id);
              const parentEvent = parentPhase?.container_id ? safeContainers.find(c => c.id === parentPhase.container_id) : null;
              return (
                <div key={item.id} className="flex items-center justify-between bg-white/60 hover:bg-white/80 p-2.5 rounded-lg border border-red-100 transition-colors">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-xs font-bold text-red-950 truncate">{item.title}</p>
                    <p className="text-[10px] text-red-700/80 truncate">
                      {parentEvent ? `${parentEvent.title} > ` : ''}{parentPhase?.title || 'Phase'} (Due: {item.expected_date ? fmtDate(item.expected_date) : 'N/A'})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                      Incomplete
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Absent Banner (For Assignee) */}
      {!isAdmin && viewMode === 'mine' && isAbsentToday && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 rounded-l-xl"></div>
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
            <span className="material-symbols-outlined text-purple-600" style={{fontVariationSettings:"'FILL' 1"}}>event_busy</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-purple-800">You are marked absent today</p>
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

      {/* Alerts columns */}
      <div className="grid grid-cols-2 gap-3 md:gap-5">
        
        {/* Overdue Alert */}
        <ExpandableUrgentCard
          title="Overdue Alert"
          items={overdueItems}
          type="Overdue"
          isExpanded={isUrgentExpanded}
          onToggle={() => setIsUrgentExpanded(!isUrgentExpanded)}
          onViewDetail={setSelectedItemDetail}
          onViewAll={() => overdueItems.length > 0 && setDetailModalData({ title: isAdmin ? 'System Overdue Tasks' : 'My Overdue Tasks', items: overdueItems, type: 'Overdue' })}
          profiles={safeProfiles}
          readOnly={readOnly}
          isAdmin={isAdmin}
        />

        {/* Not Started Alert */}
        <ExpandableUrgentCard
          title="Not Started Alert"
          items={notStartedItems}
          type="Not Started"
          isExpanded={isUrgentExpanded}
          onToggle={() => setIsUrgentExpanded(!isUrgentExpanded)}
          onViewDetail={setSelectedItemDetail}
          onViewAll={() => notStartedItems.length > 0 && setDetailModalData({ title: isAdmin ? 'System Not Started Tasks' : 'My Not Started Tasks', items: notStartedItems, type: 'Not Started' })}
          profiles={safeProfiles}
          readOnly={readOnly}
          isAdmin={isAdmin}
        />

      </div>

      {/* 3. TODAY FOCUS */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30">
        <div className="p-5 border-b border-surface-container-high flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">view_kanban</span>
          <h2 className="font-bold text-base font-headline text-on-surface">Today Focus</h2>
          <p className="text-xs text-on-surface-variant ml-1">— active work due today</p>
        </div>
        {isAdmin ? (
          <div className="p-5 bg-surface-container-lowest flex flex-col gap-4">
            {todayFocusGrouped.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium">No tasks due today.</div>
            ) : (
              todayFocusGrouped.map(([assigneeName, items]) => {
                const isCollapsed = collapsedTodayFocus[assigneeName] !== undefined ? collapsedTodayFocus[assigneeName] : isAdmin;
                const ongoing = items.filter(w => w.status === 'Ongoing');
                const assigned = items.filter(w => w.status === 'Assigned');
                
                return (
                  <div key={assigneeName} className="border border-outline-variant/30 rounded-xl bg-white overflow-hidden">
                    <div 
                      onClick={() => toggleTodayFocusAssignee(assigneeName)}
                      className="bg-slate-50/50 px-4 py-3 flex items-center justify-between cursor-pointer select-none border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-150">
                          {isCollapsed ? 'chevron_right' : 'expand_more'}
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-slate-500">person</span>
                        <span className="text-sm font-bold text-slate-700">{assigneeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ongoing.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {ongoing.length} Ongoing
                          </span>
                        )}
                        {assigned.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                            {assigned.length} Assigned
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/20 border border-blue-100/50 rounded-lg p-3 flex flex-col gap-2.5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Ongoing</h4>
                          {ongoing.map(w => (
                            <WorkItemCard key={w.id} item={w} {...cardProps} isAdmin={isAdmin} isTodayFocus={true} profiles={safeProfiles} onComplete={setPendingCompleteItem} />
                          ))}
                          {ongoing.length === 0 && (
                            <div className="text-center p-3 text-slate-400 text-xs italic">No ongoing tasks.</div>
                          )}
                        </div>
                        <div className="bg-amber-50/10 border border-amber-150 rounded-lg p-3 flex flex-col gap-2.5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Assigned / New</h4>
                          {assigned.map(w => (
                            <WorkItemCard key={w.id} item={w} {...cardProps} isAdmin={isAdmin} isTodayFocus={true} profiles={safeProfiles} onStart={startWorkItem} />
                          ))}
                          {assigned.length === 0 && (
                            <div className="text-center p-3 text-slate-400 text-xs italic">No assigned tasks.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-surface-container-lowest">
            
            <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-3 flex flex-col gap-3 min-h-[280px]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-700 flex justify-between items-center px-1">
                Ongoing
                <span className="bg-blue-100 border border-blue-200 text-blue-700 rounded-full text-[10px] px-2 py-0.5">{ongoingFocus.length}</span>
              </h3>
              {ongoingFocus.map(w => (
                <WorkItemCard key={w.id} item={w} {...cardProps} isAdmin={isAdmin} isTodayFocus={true} profiles={safeProfiles} onComplete={setPendingCompleteItem} />
              ))}
              {ongoingFocus.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-blue-100/40 rounded-lg text-blue-700/60 text-xs font-medium">No ongoing tasks.</div>
              )}
            </div>
            
            <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-3 flex flex-col gap-3 min-h-[280px]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-800 flex justify-between items-center px-1">
                Assigned / New
                <span className="bg-amber-100 border border-amber-200 text-amber-800 rounded-full text-[10px] px-2 py-0.5">{assignedFocus.length}</span>
              </h3>
              {assignedFocus.map(w => (
                <WorkItemCard key={w.id} item={w} {...cardProps} isAdmin={isAdmin} isTodayFocus={true} profiles={safeProfiles} onStart={startWorkItem} />
              ))}
              {assignedFocus.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-amber-100/40 rounded-lg text-amber-800/60 text-xs font-medium">No new assignments.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PROJECTS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30">
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">rocket_launch</span>
            <h2 className="font-bold text-base font-headline text-on-surface">Projects</h2>
            <p className="text-xs text-on-surface-variant ml-1">— active projects relevant to you</p>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {activeProjects.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic py-2">No active projects found.</p>
          ) : (
            activeProjects.map(project => {
              const milestones = getProjectMilestones(project.id);
              const urgentMilestones = milestones.filter(m => 
                m.status !== 'Completed' && 
                (m.expected_date === today || m.expected_date === tomorrowStr)
              );
              const noDateMilestones = milestones.filter(m => 
                m.status !== 'Completed' && 
                !m.expected_date
              );
              
              const isExpanded = expandedProjects.has(project.id);
              
              return (
                <div key={project.id} className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest hover:border-outline-variant/60 transition-all duration-200">
                  {/* Row Header */}
                  <div 
                    onClick={() => toggleProject(project.id)}
                    className="flex items-center justify-between p-3.5 cursor-pointer select-none hover:bg-surface-container-low/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        chevron_right
                      </span>
                      <span className="font-bold text-sm text-on-surface truncate flex-1">{project.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {/* Count badges */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full">
                          {milestones.filter(m => m.status !== 'Completed').length} to complete
                        </span>
                        {urgentMilestones.length > 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-red-100 text-red-700 border border-red-200/50 rounded-full">
                            {urgentMilestones.length} Urgent
                          </span>
                        )}
                        {noDateMilestones.length > 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/50 rounded-full">
                            {noDateMilestones.length} No Date
                          </span>
                        )}
                        {urgentMilestones.length === 0 && noDateMilestones.length === 0 && (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/20">
                            Stable
                          </span>
                        )}
                      </div>
                      
                      {/* Add milestone if expanded */}
                      {isExpanded && (
                        <button
                          onClick={() => handleAddMilestoneClick(project.id)}
                          title="Add Milestone"
                          className="w-7 h-7 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center border border-outline-variant/30 text-primary"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      )}

                      {/* Navigate to workhub projects page */}
                      <button 
                        onClick={() => navigate('/projects-events')}
                        title="Open in Workhub"
                        className="w-7 h-7 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center border border-outline-variant/30 text-on-surface-variant hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Milestones List */}
                  {isExpanded && (
                    <div className="border-t border-outline-variant/20 bg-white/50 px-4 py-3 divide-y divide-slate-100">
                      {milestones.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic py-1 px-6">No milestones defined for this project.</p>
                      ) : (
                        (() => {
                          const statusOrder = { 'Ongoing': 1, 'Assigned': 2, 'Not Started': 2, 'Completed': 3 };
                          const sortedMilestones = [...milestones].sort((a, b) => {
                            const orderA = statusOrder[a.status] || 99;
                            const orderB = statusOrder[b.status] || 99;
                            if (orderA !== orderB) return orderA - orderB;
                            if (a.expected_date && b.expected_date) return a.expected_date.localeCompare(b.expected_date);
                            if (a.expected_date) return -1;
                            if (b.expected_date) return 1;
                            return 0;
                          });
                          return sortedMilestones.map(m => {
                            const assigneeName = profiles.find(p => p.id === m.assignee_id)?.name || 'Unassigned';
                            const isMOverdue = m.status !== 'Completed' && m.expected_date && m.expected_date < today;
                            return (
                              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-2 hover:bg-slate-50/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold truncate ${m.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{m.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{assigneeName}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Status badge */}
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    m.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                    m.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {m.status}
                                  </span>
                                  
                                  {/* Due Date */}
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {m.expected_date ? fmtDate(m.expected_date) : 'No due date'}
                                  </span>
                                  
                                  {/* Overdue/Urgent badge */}
                                  {isMOverdue && (
                                    <span className="text-[9px] font-extrabold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded uppercase">
                                      Overdue
                                    </span>
                                  )}
                                  {!isMOverdue && m.status !== 'Completed' && (m.expected_date === today || m.expected_date === tomorrowStr) && (
                                    <span className="text-[9px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded uppercase">
                                      Urgent
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
          onStart={startWorkItem}
          onComplete={item => { setPendingCompleteItem(item); setSelectedItemDetail(null); }}
          isAdmin={isAdmin}
          onEdit={(item) => setEditingItem(item)}
          onDelete={deleteWorkItem}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          profiles={safeProfiles}
          onClose={() => setEditingItem(null)}
          onSave={async (id, updates) => {
            await updateWorkItem(id, updates);
            setEditingItem(null);
          }}
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

      {detailModalData && (
        <DashboardDetailModal
          data={detailModalData}
          containers={safeContainers}
          workItems={safeWorkItems}
          profiles={safeProfiles}
          currentUser={currentUser}
          onClose={() => setDetailModalData(null)}
          onStart={startWorkItem}
          onComplete={item => { setPendingCompleteItem(item); setDetailModalData(null); }}
          onFollowUp={item => setFollowUpTarget(item)}
          onViewDetail={setSelectedItemDetail}
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
            setFollowUpTarget(null);
            setDetailModalData(null);
          }}
        />
      )}

      {milestoneTarget && (
        <DashboardModal title="Add Milestone" onClose={() => setMilestoneTarget(null)}>
          <div className="flex flex-col gap-3">
            <input autoFocus className={inputCls} placeholder="Milestone title…" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
            <input type="date" className={inputCls} value={milestoneForm.date} onChange={e => setMilestoneForm(f => ({ ...f, date: e.target.value }))} />
            <select className={inputCls} value={milestoneForm.assignee_id} onChange={e => setMilestoneForm(f => ({ ...f, assignee_id: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {milestoneAssigneeOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={submitMilestone} disabled={isMilestoneSubmitting || !milestoneForm.title.trim()} className={btnPrimary}>{isMilestoneSubmitting ? 'Adding…' : 'Add Milestone'}</button>
          </div>
        </DashboardModal>
      )}
    </div>
  );
}

const inputCls = "border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";
const btnPrimary = "bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40";

function DashboardModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
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

function EditItemModal({ item, profiles, onClose, onSave }) {
  const { leaveRequests } = useDataContext();
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
    await onSave(item.id, { title, description: desc || null, assignee_id: assigneeId || null, priority, expected_date: dueDate || null, status, parent_id: item.parent_id || null });
    setLoading(false);
    onClose();
  };

  const hasLeaveOnDate = leaveRequests?.some(l =>
    l.user_id === assigneeId &&
    l.status === 'Approved' &&
    dueDate >= l.from_date && dueDate <= l.to_date
  );

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
                {(profiles || []).filter(p => p.role !== 'Admin' || currentUser?.role === 'Admin').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          {hasLeaveOnDate && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-semibold my-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
              Note: Assignee is on approved leave on this date.
            </div>
          )}
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
