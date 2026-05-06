import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDataContext } from '../context/SupabaseDataContext';
import CreateItemModal from '../components/common/CreateItemModal';

// ─── PLANNING POOL TAB ────────────────────────────────────────────────────────

const calculateAge = (dateStr) => {
  if (!dateStr) return 'New';
  const createdDate = new Date(dateStr);
  const today = new Date();
  const diffTime = today - createdDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'New';
  if (diffDays <= 3) return `Aging (${diffDays}d)`;
  return 'Aged';
};

const getAgeClass = (ageStr) => {
  if (ageStr === 'New') return 'bg-green-100 text-green-700';
  if (ageStr.startsWith('Aging')) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

// AssignmentModal removed in favor of CreateItemModal directly

function EditPoolModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item.title || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(item.id, { title: title.trim() });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-on-surface mb-4">Edit Pool Item</h2>
        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Task Title</label>
          <input 
            autoFocus
            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Item title..."
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl">Cancel</button>
          <button 
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 flex items-center justify-center disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanningPoolTab({ poolItems, onAssignClick, profiles, currentUser, searchQuery, poolSubTab }) {
  // Filter based on search
  const filtered = poolItems.filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true; 
  });

  const showCreatedBy = currentUser?.role === 'Admin' && poolSubTab !== 'Self';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
            <tr>
              <th className="px-5 py-3">Task Title</th>
              <th className="px-5 py-3 w-32">Aging Status</th>
              {showCreatedBy && <th className="px-5 py-3">Created By</th>}
              <th className="px-5 py-3 text-right pr-4 w-48">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low text-sm font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-14 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2 block">done_all</span>
                  <p>Pool is empty.</p>
                </td>
              </tr>
            ) : filtered.map(item => {
              const ageStr = calculateAge(item.created_at);
              const creator = profiles.find(p => p.id === item.created_by)?.name || 'Unknown';

              return (
                <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-5 py-4 text-on-surface font-semibold">{item.title}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${getAgeClass(ageStr)}`}>
                      {ageStr}
                    </span>
                  </td>
                  {showCreatedBy && (
                    <td className="px-5 py-4 text-on-surface-variant text-xs">{creator}</td>
                  )}
                  <td className="px-5 py-4 text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      {currentUser?.role === 'Admin' || currentUser?.id === item.created_by ? (
                        <>
                          <button
                            onClick={() => onAssignClick(item, 'edit')}
                            className="text-on-surface-variant hover:text-primary transition-colors p-1"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => onAssignClick(item, 'delete')}
                            className="text-on-surface-variant hover:text-error transition-colors p-1"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={() => onAssignClick(item, 'assign')}
                        className="flex items-center gap-1 ml-2 text-[11px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                      >
                        <span className="material-symbols-outlined text-[14px]">person_add</span>
                        Assign
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS TAB (ADMIN ONLY) ──────────────────────────────────────────

function NotificationsTab({ currentUser, profiles }) {
  const { announcements, addAnnouncement, deleteAnnouncement, getActiveAnnouncements, getDynamicNotificationText } = useDataContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState('Text'); // 'Text' or 'Program'
  const [form, setForm] = useState({ message: '', event_date: '', event_time: '', staff_group: 'Both' });

  const activeNotices = getActiveAnnouncements();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.message.trim() || !form.event_date) return;
    
    await addAnnouncement({
      title: type === 'Program' ? form.message : 'Text', // Reuse message field for Subject if Program
      message: type === 'Text' ? form.message : null,
      event_date: form.event_date,
      event_time: type === 'Program' ? form.event_time : null,
      type: type,
      staff_group: form.staff_group
    });
    
    setIsModalOpen(false);
    setForm({ message: '', event_date: '', event_time: '', staff_group: 'Both' });
  };

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between">
          <h2 className="font-bold text-base font-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            Notifications
          </h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span> Add
          </button>
        </div>

        <div className="divide-y divide-surface-container-low">
          {activeNotices.length === 0 ? (
            <p className="px-5 py-10 text-center text-on-surface-variant text-sm">No active notifications.</p>
          ) : (
            <>
              {isAdmin && (
                <>
                  <div className="bg-surface-container-lowest border-b border-surface-container-low px-5 py-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">Admin Announcements</h3>
                  </div>
                  {activeNotices.filter(n => profiles?.find(p => p.id === n.created_by)?.role === 'Admin').map(notice => renderNotice(notice, isAdmin, currentUser, profiles, deleteAnnouncement, getDynamicNotificationText))}
                  
                  <div className="bg-surface-container-lowest border-b border-surface-container-low border-t border-surface-container-high px-5 py-2 mt-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Assignee Announcements</h3>
                  </div>
                  {activeNotices.filter(n => profiles?.find(p => p.id === n.created_by)?.role !== 'Admin').map(notice => renderNotice(notice, isAdmin, currentUser, profiles, deleteAnnouncement, getDynamicNotificationText))}
                </>
              )}
              {!isAdmin && (
                activeNotices.map(notice => renderNotice(notice, isAdmin, currentUser, profiles, deleteAnnouncement, getDynamicNotificationText))
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container bg-surface-container-lowest">
              <h2 className="font-bold text-base font-headline text-on-surface">Add Notification</h2>
              <button onClick={() => setIsModalOpen(false)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              {/* Type Selection */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Step 1: Select Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setType('Text')} className={`flex-1 py-2 text-sm font-bold border rounded-lg transition-all flex items-center justify-center gap-2 ${type === 'Text' ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/40 text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">campaign</span> Text
                  </button>
                  <button type="button" onClick={() => setType('Program')} className={`flex-1 py-2 text-sm font-bold border rounded-lg transition-all flex items-center justify-center gap-2 ${type === 'Program' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-outline-variant/40 text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">event</span> Program
                  </button>
                </div>
              </div>

              {type === 'Text' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Message (Text Only) *</label>
                    <textarea required className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" rows={3} value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Show Until *</label>
                    <input type="date" required className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))} />
                  </div>
                </>
              )}

              {type === 'Program' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Subject *</label>
                    <input required className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Date *</label>
                      <input type="date" required className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Time (Optional)</label>
                      <input type="time" className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.event_time} onChange={e => setForm(f => ({...f, event_time: e.target.value}))} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Target Audience</label>
                <select className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.staff_group} onChange={e => setForm(f => ({...f, staff_group: e.target.value}))}>
                  <option value="Both">Both (All Staff)</option>
                  <option value="Office Staff">Office Staff</option>
                  <option value="Institution">Institution</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={!form.message || !form.event_date} className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                  Save Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Helper to render individual notices
function renderNotice(notice, isAdmin, currentUser, profiles, deleteAnnouncement, getDynamicNotificationText) {
  const isText = notice.type === 'Text';
  const displayStr = getDynamicNotificationText(notice);
  const mainText = isText ? notice.message : notice.title;
  const creatorName = profiles?.find(p => p.id === notice.created_by)?.name || 'Unknown';
  const canDelete = isAdmin || currentUser?.id === notice.created_by;
  
  return (
    <div key={notice.id} className="flex items-start justify-between px-5 py-4 hover:bg-surface-container-low/30 transition-colors group">
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-[20px] pt-0.5 ${isText ? 'text-blue-500' : 'text-indigo-500'}`}>
          {isText ? 'campaign' : 'event'}
        </span>
        <div>
          <h3 className="font-semibold text-sm text-on-surface">{mainText}</h3>
          {displayStr && <p className="text-xs text-on-surface-variant font-medium mt-0.5">{displayStr}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block ${notice.staff_group === 'Both' ? 'bg-purple-100 text-purple-700' : notice.staff_group === 'Institution' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {notice.staff_group === 'Both' ? 'All Staff' : notice.staff_group}
            </span>
            <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
              Tagged by {creatorName.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>
      {canDelete && (
        <button
          onClick={() => deleteAnnouncement(notice.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error px-2 py-1"
          title="Delete"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      )}
    </div>
  );
}

// ─── MAIN PLANNING PAGE ────────────────────────────────────────────────────────

export default function PlanningPage() {
  const { workItems, currentUser, profiles, updateWorkItem, deleteWorkItem, addContainer, addWorkItem } = useDataContext();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Pool');
  const [poolSubTab, setPoolSubTab] = useState('Self'); // 'Self' | 'Admins' | 'Assignees'
  const [assigneeFilterCategory, setAssigneeFilterCategory] = useState('');
  const [assigneeFilterName, setAssigneeFilterName]         = useState('');
  const [assignmentItem, setAssignmentItem] = useState(null);
  const [editingPoolItem, setEditingPoolItem] = useState(null);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const isSuperAdmin = currentUser?.role === 'Admin';

  let poolItems = (workItems || []).filter(w => w.in_planning_pool && !w.is_recurring);

  if (!isSuperAdmin) {
    poolItems = poolItems.filter(w => w.created_by === currentUser?.id);
  } else {
    poolItems = poolItems.filter(w => {
      const creator = profiles?.find(p => p.id === w.created_by);
      if (poolSubTab === 'Self') return w.created_by === currentUser?.id;
      if (poolSubTab === 'Admins') return creator?.role === 'Admin' && w.created_by !== currentUser?.id;
      if (poolSubTab === 'Assignees') return creator?.role !== 'Admin';
      return true;
    });
    if (poolSubTab === 'Assignees') {
      if (assigneeFilterCategory) {
        poolItems = poolItems.filter(w => {
          const creator = profiles?.find(p => p.id === w.created_by);
          return (creator?.category || 'Office Staff') === assigneeFilterCategory;
        });
      }
      if (assigneeFilterName) {
        poolItems = poolItems.filter(w => w.created_by === assigneeFilterName);
      }
    }
  }

  const assigneeProfiles = (profiles || []).filter(p => p.role !== 'Admin');
  const assigneeCategories = [...new Set(assigneeProfiles.map(p => p.category || 'Office Staff'))];
  const filteredByCategory = assigneeFilterCategory
    ? assigneeProfiles.filter(p => (p.category || 'Office Staff') === assigneeFilterCategory)
    : assigneeProfiles;

  const handleAssignTask = async (item, assigneeId) => {
    // Keep it here just in case, but no longer used directly by direct conversion.
  };

  const handleAssignProject = async (item, assigneeId, date, milestoneTitle) => {
    // Keep it here just in case, but no longer used directly.
  };

  const handlePoolAction = async (item, action) => {
    if (action === 'edit') {
      setEditingPoolItem(item);
    } else if (action === 'delete') {
      await deleteWorkItem(item.id);
    } else {
      setAssignmentItem(item);
    }
  };


  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-12 animate-fade-in">

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Admin Sub-Tabs */}
        <div className="flex flex-col gap-2">
          {isSuperAdmin && activeTab === 'Pool' ? (
            <>
              <div className="flex bg-surface-container rounded-xl p-1 gap-0.5">
                <button onClick={() => setPoolSubTab('Self')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${poolSubTab === 'Self' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>Self</button>
                <button onClick={() => setPoolSubTab('Admins')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${poolSubTab === 'Admins' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>Admins</button>
                <button onClick={() => { setPoolSubTab('Assignees'); setAssigneeFilterCategory(''); setAssigneeFilterName(''); }} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${poolSubTab === 'Assignees' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>Assignees</button>
              </div>
              {poolSubTab === 'Assignees' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={assigneeFilterCategory} onChange={e => { setAssigneeFilterCategory(e.target.value); setAssigneeFilterName(''); }}
                    className="border border-outline-variant/40 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Categories</option>
                    {assigneeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={assigneeFilterName} onChange={e => setAssigneeFilterName(e.target.value)}
                    className="border border-outline-variant/40 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Names</option>
                    {filteredByCategory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </>
          ) : <div className="hidden md:block w-4" />}
        </div>

        {/* Global Search & Action Tabs */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search 🔍" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-outline-variant/40 rounded-full py-1.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-48 transition-all"
            />
          </div>
          
          {/* Tabs for all roles */}
          <div className="flex bg-surface-container rounded-xl p-1 gap-0.5">
            <button 
              onClick={() => setActiveTab('Pool')} 
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'Pool' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Pool
            </button>
            <button 
              onClick={() => setActiveTab('Notifications')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'Notifications' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Notifications
            </button>
          </div>
        </div>
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'Pool' && (
        <PlanningPoolTab 
          poolItems={poolItems} 
          onAssignClick={handlePoolAction} 
          profiles={profiles} 
          currentUser={currentUser}
          searchQuery={searchQuery}
          poolSubTab={poolSubTab}
        />
      )}

      {activeTab === 'Notifications' && (
        <NotificationsTab currentUser={currentUser} profiles={profiles} />
      )}

      {assignmentItem && (
        <CreateItemModal
          initialData={assignmentItem}
          onClose={() => setAssignmentItem(null)}
          onSuccessConvert={async () => {
             await deleteWorkItem(assignmentItem.id);
          }}
        />
      )}

      {editingPoolItem && (
        <EditPoolModal 
          item={editingPoolItem}
          onClose={() => setEditingPoolItem(null)}
          onSave={updateWorkItem}
        />
      )}
    </div>
  );
}
