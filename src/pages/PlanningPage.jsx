import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDataContext } from '../context/SupabaseDataContext';
import CreateItemModal from '../components/common/CreateItemModal';
import ClockTimePicker from '../components/common/ClockTimePicker';
import { getISTDateString } from '../lib/dateUtils';

import NotesFilterToolbar from '../components/planning/NotesFilterToolbar';
import NoteCard, { calculateAge, parseNoteTitleAndBody } from '../components/planning/NoteCard';
import NoteListRow from '../components/planning/NoteListRow';
import NoteEditorModal from '../components/planning/NoteEditorModal';

// ─── ANNOUNCEMENTS MODALS & TAB ────────────────────────────────────────────────

function EditNoticeModal({ notice, onClose, onSave, isAdmin }) {
  const isText = notice.type === 'Text';
  const [form, setForm] = useState({
    message: isText ? notice.message : notice.title,
    event_date: notice.event_date || '',
    event_time: notice.event_time || '',
    is_pinned: notice.is_pinned || false,
    staff_group: notice.staff_group || 'Both'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim() || !form.event_date) return;
    setSaving(true);
    await onSave(notice.id, {
      title: isText ? 'Text' : form.message.trim(),
      message: isText ? form.message.trim() : '',
      event_date: form.event_date,
      event_time: isText ? null : (form.event_time || null),
      is_pinned: form.is_pinned,
      staff_group: form.staff_group
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-base font-headline text-on-surface mb-4">Edit Announcement</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline">{isText ? 'Message' : 'Subject'} *</label>
            <textarea required className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none" rows={2} value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Date *</label>
              <input type="date" required className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} />
            </div>
            {!isText && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Time</label>
                <ClockTimePicker 
                  className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none" 
                  value={form.event_time} 
                  onChange={val => setForm({...form, event_time: val})} 
                />
              </div>
            )}
          </div>
          {isAdmin && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({...form, is_pinned: e.target.checked})} className="rounded text-primary" />
              <span className="text-sm font-bold text-on-surface">Pin this announcement</span>
            </label>
          )}
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl">Cancel</button>
            <button type="submit" disabled={saving || !form.message || !form.event_date} className="flex-1 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementsTab({ currentUser, profiles }) {
  const { announcements, updateAnnouncement, deleteAnnouncement, getDynamicNotificationText } = useDataContext();
  const [subTab, setSubTab] = useState('Active'); // Active | Expired
  const [editingAnn, setEditingAnn] = useState(null);
  
  const isAdmin = currentUser?.role === 'Admin';

  const today = getISTDateString();
  const todayDate = new Date(today + 'T00:00:00');

  let activeNotices = [];
  let expiredNotices = [];

  announcements.forEach(a => {
    const eventDate = new Date(a.event_date + 'T00:00:00');
    if (todayDate <= eventDate) activeNotices.push(a);
    else expiredNotices.push(a);
  });

  activeNotices.sort((a, b) => {
    const cA = profiles?.find(p => p.id === a.created_by);
    const cB = profiles?.find(p => p.id === b.created_by);
    const isAdminA = cA?.role === 'Admin';
    const isAdminB = cB?.role === 'Admin';

    if (isAdminA && !isAdminB) return -1;
    if (!isAdminA && isAdminB) return 1;
    if (isAdminA && isAdminB) {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  expiredNotices.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const noticesToRender = subTab === 'Active' ? activeNotices : expiredNotices;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-base font-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
              Announcements
            </h2>
            {isAdmin && (
              <div className="flex bg-surface-container rounded-lg p-0.5">
                <button onClick={() => setSubTab('Active')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'Active' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>Active</button>
                <button onClick={() => setSubTab('Expired')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'Expired' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>Expired</button>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-surface-container-low">
          {noticesToRender.length === 0 ? (
            <p className="px-5 py-10 text-center text-on-surface-variant text-sm font-medium">No {subTab.toLowerCase()} announcements.</p>
          ) : (
            noticesToRender.map(notice => (
              <NoticeCard 
                key={notice.id} 
                notice={notice} 
                isAdmin={isAdmin} 
                currentUser={currentUser} 
                profiles={profiles} 
                getDynamicNotificationText={getDynamicNotificationText}
                onEdit={() => setEditingAnn(notice)}
                onDelete={() => deleteAnnouncement(notice.id)}
                onTogglePin={async () => updateAnnouncement(notice.id, { is_pinned: !notice.is_pinned })}
              />
            ))
          )}
        </div>
      </div>

      {editingAnn && (
        <EditNoticeModal 
          notice={editingAnn} 
          onClose={() => setEditingAnn(null)} 
          onSave={updateAnnouncement}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

function NoticeCard({ notice, isAdmin, _currentUser, profiles, getDynamicNotificationText, onEdit, onDelete, onTogglePin }) {
  const isText = notice.type === 'Text';
  const displayStr = getDynamicNotificationText(notice);
  const mainText = isText ? notice.message : notice.title;
  
  const creatorProfile = profiles?.find(p => p.id === notice.created_by);
  const creatorIsAdmin = creatorProfile?.role === 'Admin';
  const creatorName = creatorProfile?.name || 'Unknown';
  
  const canEdit = isAdmin;

  return (
    <div className={`flex items-start justify-between px-5 py-4 hover:bg-surface-container-low/30 transition-colors group ${notice.is_pinned ? 'bg-amber-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-[20px] pt-0.5 ${notice.is_pinned ? 'text-amber-500' : isText ? 'text-blue-500' : 'text-indigo-500'}`} style={{ fontVariationSettings: notice.is_pinned ? "'FILL' 1" : "'FILL' 0" }}>
          {notice.is_pinned ? 'keep' : isText ? 'campaign' : 'event'}
        </span>
        <div>
          <h3 className="font-semibold text-sm text-on-surface">{mainText}</h3>
          {displayStr && <p className="text-xs text-on-surface-variant font-medium mt-0.5">{displayStr}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block ${notice.staff_group === 'Both' ? 'bg-purple-100 text-purple-700' : notice.staff_group === 'Institution' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {notice.staff_group === 'Both' ? 'All Staff' : notice.staff_group}
            </span>
            {!creatorIsAdmin && (
              <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                Posted by {creatorName}
              </span>
            )}
            {notice.is_pinned && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded inline-block bg-amber-100 text-amber-700">Pinned</span>
            )}
          </div>
        </div>
      </div>
      {canEdit && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {isAdmin && (
            <button onClick={onTogglePin} className="text-on-surface-variant hover:text-amber-500 p-1" title={notice.is_pinned ? "Unpin" : "Pin"}>
              <span className="material-symbols-outlined text-[18px]">keep</span>
            </button>
          )}
          <button onClick={onEdit} className="text-on-surface-variant hover:text-primary p-1" title="Edit">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={onDelete} className="text-on-surface-variant hover:text-error p-1" title="Delete">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PLANNING PAGE (V2 NOTES WORKSPACE) ───────────────────────────────────

export default function PlanningPage() {
  const { workItems, currentUser, profiles, addWorkItem, updateWorkItem, deleteWorkItem } = useDataContext();
  const location = useLocation();

  // Navigation & Primary Tabs
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab === 'Notifications' || location.state?.activeTab === 'Announcements'
      ? 'Announcements'
      : (location.state?.activeTab || 'Notes')
  );

  // View & Filter States
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list' | 'comfortable'
  const [sortBy, setSortBy] = useState('recently_edited');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Admin & Manager Subtabs & Filters
  const [poolSubTab, setPoolSubTab] = useState('Self'); // 'Self' | 'Admins' | 'Assignees'
  const [assigneeFilterCategory, setAssigneeFilterCategory] = useState('');
  const [assigneeFilterName, setAssigneeFilterName] = useState('');

  // Multi-Selection Batch State
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [editingNote, setEditingNote] = useState(null);
  const [isCreatingNote, setIsCreatingNote] = useState(location.state?.openNewNote || false);
  const [assignmentItem, setAssignmentItem] = useState(null);

  const isSuperAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';

  // 1. Fetch raw planning items
  let poolItems = (workItems || []).filter(w => w.in_planning_pool && !w.is_recurring);

  // 2. Role-based filtering
  if (!isSuperAdmin) {
    if (isManager) {
      poolItems = poolItems.filter(w => {
        if (w.created_by === currentUser?.id || w.assignee_id === currentUser?.id) return true;
        const creator = profiles?.find(p => p.id === w.created_by);
        return creator?.manager === currentUser?.name;
      });
    } else {
      poolItems = poolItems.filter(w => w.created_by === currentUser?.id || w.assignee_id === currentUser?.id);
    }
  } else {
    poolItems = poolItems.filter(w => {
      const creator = profiles?.find(p => p.id === w.created_by);
      if (poolSubTab === 'Self') return w.created_by === currentUser?.id || w.assignee_id === currentUser?.id;
      if (poolSubTab === 'Admins') return (creator?.role === 'Admin' && w.created_by !== currentUser?.id) || w.assignee_id === currentUser?.id;
      if (poolSubTab === 'Assignees') return creator?.role !== 'Admin' || w.assignee_id === currentUser?.id;
      return true;
    });

    if (poolSubTab === 'Assignees') {
      if (assigneeFilterCategory) {
        poolItems = poolItems.filter(w => {
          const creator = profiles?.find(p => p.id === w.created_by);
          const assignee = profiles?.find(p => p.id === w.assignee_id);
          return (creator?.category || 'Office Staff') === assigneeFilterCategory || (assignee?.category || '') === assigneeFilterCategory;
        });
      }
      if (assigneeFilterName) {
        poolItems = poolItems.filter(w => w.created_by === assigneeFilterName || w.assignee_id === assigneeFilterName);
      }
    }
  }

  // Dynamic user-specific tags extracted strictly from notes visible to this user
  const availableTags = [...new Set(
    poolItems.flatMap(w => Array.isArray(w.tags) ? w.tags : [])
  )].filter(Boolean).sort();

  // 3. Apply Archived filter
  poolItems = poolItems.filter(w => showArchived ? w.is_archived : !w.is_archived);

  // 4. Apply Starred / Favorites filter
  if (showFavoritesOnly) {
    poolItems = poolItems.filter(w => w.is_favorite);
  }

  // 5. Apply Priority filter
  if (priorityFilter) {
    poolItems = poolItems.filter(w => w.priority === priorityFilter);
  }

  // 6. Apply Aging filter
  if (agingFilter) {
    poolItems = poolItems.filter(w => calculateAge(w.created_at).startsWith(agingFilter));
  }

  // 7. Apply Multi-Tags filter
  if (selectedTags.length > 0) {
    poolItems = poolItems.filter(w => {
      const itemTags = Array.isArray(w.tags) ? w.tags : [];
      const itemDesc = (w.description || '').toLowerCase();
      return selectedTags.every(st => {
        const cleanTag = st.toLowerCase();
        return itemTags.some(t => t.toLowerCase() === cleanTag) || itemDesc.includes(cleanTag);
      });
    });
  }

  // 8. Apply Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    poolItems = poolItems.filter(w => {
      const t = (w.title || '').toLowerCase();
      const d = (w.description || '').toLowerCase();
      const itemTags = Array.isArray(w.tags) ? w.tags.join(' ').toLowerCase() : '';
      return t.includes(q) || d.includes(q) || itemTags.includes(q);
    });
  }

  // 9. Sort Notes
  poolItems.sort((a, b) => {
    // Pinned notes always stay at top
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    if (sortBy === 'recently_edited') {
      const timeA = new Date(a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.updated_at || b.created_at).getTime();
      return timeB - timeA;
    }
    if (sortBy === 'recently_created') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === 'alphabetical') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (sortBy === 'priority') {
      const pOrder = { High: 1, Medium: 2, Low: 3 };
      return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
    }
    if (sortBy === 'aging') {
      const ageA = calculateAge(a.created_at);
      const ageB = calculateAge(b.created_at);
      const ageOrder = (str) => str === 'Aged' ? 1 : str.startsWith('Aging') ? 2 : 3;
      return ageOrder(ageA) - ageOrder(ageB);
    }
    return 0;
  });

  // Separate pinned & unpinned for UI rendering
  const pinnedNotes = poolItems.filter(w => w.is_pinned);
  const unpinnedNotes = poolItems.filter(w => !w.is_pinned);

  // Multi-Selection Handlers
  const toggleSelectNote = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === poolItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(poolItems.map(w => w.id));
    }
  };

  // Quick Card Handlers
  const handleTogglePin = async (note) => {
    await updateWorkItem(note.id, { is_pinned: !note.is_pinned, updated_at: new Date().toISOString() });
  };

  const handleToggleFavorite = async (note) => {
    await updateWorkItem(note.id, { is_favorite: !note.is_favorite, updated_at: new Date().toISOString() });
  };

  const handleChangeColor = async (id, newColor) => {
    await updateWorkItem(id, { color: newColor, updated_at: new Date().toISOString() });
  };

  const handleDuplicate = async (note) => {
    const { title, body } = parseNoteTitleAndBody(note);
    await addWorkItem({
      title: `${title} (Copy)`,
      description: body || note.description || '',
      priority: note.priority || 'Medium',
      color: note.color || 'default',
      tags: Array.isArray(note.tags) ? [...note.tags] : [],
      in_planning_pool: true,
      created_by: currentUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  };

  const handleArchive = async (note) => {
    await updateWorkItem(note.id, { is_archived: !note.is_archived, updated_at: new Date().toISOString() });
  };

  // Batch Handlers
  const handleBatchDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} notes?`)) return;
    for (const id of selectedIds) {
      await deleteWorkItem(id);
    }
    setSelectedIds([]);
  };

  const handleBatchArchive = async () => {
    for (const id of selectedIds) {
      await updateWorkItem(id, { is_archived: true, updated_at: new Date().toISOString() });
    }
    setSelectedIds([]);
  };

  const handleBatchChangePriority = async () => {
    const p = window.prompt("Set priority for selected notes (High, Medium, Low):", "High");
    if (!p || !['High', 'Medium', 'Low'].includes(p)) return;
    for (const id of selectedIds) {
      await updateWorkItem(id, { priority: p, updated_at: new Date().toISOString() });
    }
    setSelectedIds([]);
  };

  const handleBatchAddTag = async () => {
    const tag = window.prompt("Enter tag to add to selected notes (e.g. #Meeting):", "#FollowUp");
    if (!tag) return;
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
    for (const id of selectedIds) {
      const item = poolItems.find(w => w.id === id);
      const existing = Array.isArray(item?.tags) ? item.tags : [];
      if (!existing.includes(cleanTag)) {
        await updateWorkItem(id, { tags: [...existing, cleanTag], updated_at: new Date().toISOString() });
      }
    }
    setSelectedIds([]);
  };

  const handleBatchAssign = () => {
    const firstSelected = poolItems.find(w => w.id === selectedIds[0]);
    if (firstSelected) {
      setAssignmentItem(firstSelected);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full md:max-w-[1280px] mx-auto pb-24 animate-fade-in relative min-h-screen">
      
      {/* TOP CONTROL & FILTER TOOLBAR */}
      <NotesFilterToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        availableTags={availableTags}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        agingFilter={agingFilter}
        setAgingFilter={setAgingFilter}
        showFavoritesOnly={showFavoritesOnly}
        setShowFavoritesOnly={setShowFavoritesOnly}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        currentUser={currentUser}
        profiles={profiles}
        poolSubTab={poolSubTab}
        setPoolSubTab={setPoolSubTab}
        assigneeFilterCategory={assigneeFilterCategory}
        setAssigneeFilterCategory={setAssigneeFilterCategory}
        assigneeFilterName={assigneeFilterName}
        setAssigneeFilterName={setAssigneeFilterName}
        // Multi-select props
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={handleSelectAll}
        totalCount={poolItems.length}
        onBatchAssign={handleBatchAssign}
        onBatchDelete={handleBatchDelete}
        onBatchArchive={handleBatchArchive}
        onBatchChangePriority={handleBatchChangePriority}
        onBatchAddTag={handleBatchAddTag}
        onOpenNewNote={() => setIsCreatingNote(true)}
      />

      {/* TABS CONTENT */}
      {activeTab === 'Notes' && (
        <div className="flex flex-col gap-6">
          
          {/* EMPTY STATE */}
          {poolItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center text-center my-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">edit_note</span>
              </div>
              <h3 className="font-bold text-lg font-headline text-on-surface mb-1">
                {showArchived ? 'No archived notes found' : 'Your Notes Workspace is Empty'}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-6 leading-relaxed">
                Capture quick ideas, meeting notes, project specs, or task drafts naturally. Click the (+) button below to create your first note.
              </p>
              <button
                onClick={() => setIsCreatingNote(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md hover:opacity-90 transition-all uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Create First Note
              </button>
            </div>
          ) : (
            <>
              {/* PINNED NOTES SECTION */}
              {pinnedNotes.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-outline flex items-center gap-1.5 pl-1">
                    <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>keep</span>
                    Pinned Notes ({pinnedNotes.length})
                  </h3>

                  {viewMode === 'list' ? (
                    <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm divide-y divide-surface-container-low overflow-hidden">
                      {pinnedNotes.map(note => (
                        <NoteListRow
                          key={note.id}
                          note={note}
                          profiles={profiles}
                          currentUser={currentUser}
                          isSelected={selectedIds.includes(note.id)}
                          onToggleSelect={toggleSelectNote}
                          onEdit={setEditingNote}
                          onAssign={setAssignmentItem}
                          onTogglePin={handleTogglePin}
                          onToggleFavorite={handleToggleFavorite}
                          onArchive={handleArchive}
                          onDelete={deleteWorkItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${
                      viewMode === 'comfortable' 
                        ? 'grid-cols-1 md:grid-cols-2' 
                        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}>
                      {pinnedNotes.map(note => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          profiles={profiles}
                          currentUser={currentUser}
                          isSelected={selectedIds.includes(note.id)}
                          onToggleSelect={toggleSelectNote}
                          onEdit={setEditingNote}
                          onAssign={setAssignmentItem}
                          onTogglePin={handleTogglePin}
                          onToggleFavorite={handleToggleFavorite}
                          onChangeColor={handleChangeColor}
                          onDuplicate={handleDuplicate}
                          onArchive={handleArchive}
                          onDelete={deleteWorkItem}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* UNPINNED NOTES SECTION */}
              {unpinnedNotes.length > 0 && (
                <div className="flex flex-col gap-3">
                  {pinnedNotes.length > 0 && (
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-outline pl-1 pt-2">
                      Others ({unpinnedNotes.length})
                    </h3>
                  )}

                  {viewMode === 'list' ? (
                    <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm divide-y divide-surface-container-low overflow-hidden">
                      {unpinnedNotes.map(note => (
                        <NoteListRow
                          key={note.id}
                          note={note}
                          profiles={profiles}
                          currentUser={currentUser}
                          isSelected={selectedIds.includes(note.id)}
                          onToggleSelect={toggleSelectNote}
                          onEdit={setEditingNote}
                          onAssign={setAssignmentItem}
                          onTogglePin={handleTogglePin}
                          onToggleFavorite={handleToggleFavorite}
                          onArchive={handleArchive}
                          onDelete={deleteWorkItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${
                      viewMode === 'comfortable' 
                        ? 'grid-cols-1 md:grid-cols-2' 
                        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}>
                      {unpinnedNotes.map(note => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          profiles={profiles}
                          currentUser={currentUser}
                          isSelected={selectedIds.includes(note.id)}
                          onToggleSelect={toggleSelectNote}
                          onEdit={setEditingNote}
                          onAssign={setAssignmentItem}
                          onTogglePin={handleTogglePin}
                          onToggleFavorite={handleToggleFavorite}
                          onChangeColor={handleChangeColor}
                          onDuplicate={handleDuplicate}
                          onArchive={handleArchive}
                          onDelete={deleteWorkItem}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ANNOUNCEMENTS TAB */}
      {activeTab === 'Announcements' && (
        <AnnouncementsTab currentUser={currentUser} profiles={profiles} />
      )}

      {/* APPLE NOTES EDITOR MODAL (New or Edit) */}
      {(isCreatingNote || editingNote) && (
        <NoteEditorModal
          note={editingNote}
          profiles={profiles}
          currentUser={currentUser}
          onClose={() => {
            setIsCreatingNote(false);
            setEditingNote(null);
          }}
          onSave={async (idOrData, updates) => {
            if (typeof idOrData === 'string') {
              return await updateWorkItem(idOrData, updates);
            } else {
              return await addWorkItem({
                ...idOrData,
                created_by: currentUser?.id,
                created_at: new Date().toISOString()
              });
            }
          }}
          onAssign={(noteToAssign) => {
            setAssignmentItem(noteToAssign);
          }}
        />
      )}

      {/* ASSIGN / CONVERT ITEM MODAL (Promotes Note to Task/Project/Event) */}
      {assignmentItem && (
        <CreateItemModal
          initialData={{
            ...assignmentItem,
            title: assignmentItem.title || 'New Task',
            description: assignmentItem.description || ''
          }}
          onClose={() => setAssignmentItem(null)}
          onSuccessConvert={async () => {
            // Note converted to active work item - automatically remove original note
            await deleteWorkItem(assignmentItem.id);
            setAssignmentItem(null);
          }}
        />
      )}
    </div>
  );
}
