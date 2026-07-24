import React, { useState } from 'react';

export default function NotesFilterToolbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  selectedTags,
  setSelectedTags,
  availableTags = [],
  priorityFilter,
  setPriorityFilter,
  agingFilter,
  setAgingFilter,
  showFavoritesOnly,
  setShowFavoritesOnly,
  showArchived,
  setShowArchived,
  currentUser,
  profiles,
  poolSubTab,
  setPoolSubTab,
  assigneeFilterCategory,
  setAssigneeFilterCategory,
  assigneeFilterName,
  setAssigneeFilterName,
  // Multi-select batch props
  selectedIds,
  onClearSelection,
  onSelectAll,
  totalCount,
  onBatchAssign,
  onBatchDelete,
  onBatchArchive,
  onBatchChangePriority,
  onBatchAddTag,
  onOpenNewNote
}) {
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isSuperAdmin = currentUser?.role === 'Admin';

  const toggleTag = (tag) => {
    const clean = tag.startsWith('#') ? tag : `#${tag}`;
    if (selectedTags.includes(clean)) {
      setSelectedTags(selectedTags.filter(t => t !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  const handleAddCustomTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      toggleTag(tagInput.trim());
      setTagInput('');
    }
  };

  const activeFilterCount = (selectedTags.length > 0 ? 1 : 0) +
    (priorityFilter ? 1 : 0) +
    (agingFilter ? 1 : 0) +
    (showFavoritesOnly ? 1 : 0) +
    (showArchived ? 1 : 0);

  const assigneeProfiles = (profiles || []).filter(p => p.role !== 'Admin');
  const assigneeCategories = [...new Set(assigneeProfiles.map(p => p.category || 'Office Staff'))];
  const filteredByCategory = assigneeFilterCategory
    ? assigneeProfiles.filter(p => (p.category || 'Office Staff') === assigneeFilterCategory)
    : assigneeProfiles;

  const isBatchActive = selectedIds && selectedIds.length > 0;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* SIMPLE STREAMLINED APPLE NOTES STYLE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-outline-variant/30 shadow-xs">
        
        {/* Left: Title & Admin Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">description</span>
            <h1 className="text-lg font-bold font-headline text-on-surface tracking-tight">Notes</h1>
          </div>

          {isSuperAdmin && activeTab === 'Notes' && (
            <div className="flex bg-surface-container rounded-xl p-0.5 gap-0.5 ml-2">
              <button 
                onClick={() => setPoolSubTab('Self')} 
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${poolSubTab === 'Self' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                My Notes
              </button>
              <button 
                onClick={() => setPoolSubTab('Admins')} 
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${poolSubTab === 'Admins' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Admins
              </button>
              <button 
                onClick={() => { setPoolSubTab('Assignees'); setAssigneeFilterCategory(''); setAssigneeFilterName(''); }} 
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${poolSubTab === 'Assignees' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Staff Notes
              </button>
            </div>
          )}

          {isSuperAdmin && activeTab === 'Notes' && poolSubTab === 'Assignees' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select 
                value={assigneeFilterCategory} 
                onChange={e => { setAssigneeFilterCategory(e.target.value); setAssigneeFilterName(''); }}
                className="border border-outline-variant/40 rounded-xl px-2 py-1 text-xs bg-surface-container-lowest focus:outline-none text-on-surface font-medium"
              >
                <option value="">All Categories</option>
                {assigneeCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={assigneeFilterName} 
                onChange={e => setAssigneeFilterName(e.target.value)}
                className="border border-outline-variant/40 rounded-xl px-2 py-1 text-xs bg-surface-container-lowest focus:outline-none text-on-surface font-medium"
              >
                <option value="">All Staff</option>
                {filteredByCategory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Right Controls: Search, View Mode, Filter & Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Instant Search Bar */}
          <div className="relative flex-1 md:w-48 min-w-[150px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search notes & #tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-1.5 pl-8 pr-7 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-on-surface placeholder:text-outline"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5"
              >
                <span className="material-symbols-outlined text-xs">cancel</span>
              </button>
            )}
          </div>

          {activeTab === 'Notes' && (
            <>
              {/* Create Note Button (Inline Apple Notes Style) */}
              <button
                onClick={onOpenNewNote}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity shadow-xs"
                title="Create New Note"
              >
                <span className="material-symbols-outlined text-base">edit_note</span>
                <span className="hidden sm:inline">New Note</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex bg-surface-container rounded-xl p-0.5 gap-0.5 border border-outline-variant/20">
                <button
                  onClick={() => setViewMode('cards')}
                  title="Card View (Google Keep)"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[17px]">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode('comfortable')}
                  title="Comfortable View"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'comfortable' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[17px]">view_agenda</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="Compact List View"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[17px]">format_list_bulleted</span>
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-2 py-1.5 text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="recently_edited">Recently Edited</option>
                <option value="recently_created">Recently Created</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
                <option value="aging">Aging Status</option>
                <option value="alphabetical">Title (A-Z)</option>
              </select>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  activeFilterCount > 0 || showFilterDrawer
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-base">filter_list</span>
                {activeFilterCount > 0 && (
                  <span className="bg-primary text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Tab Switcher: Notes vs Announcements */}
          <div className="flex bg-surface-container rounded-xl p-0.5 gap-0.5 border border-outline-variant/20 ml-auto md:ml-0">
            <button
              onClick={() => setActiveTab('Notes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'Notes' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('Announcements')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'Announcements' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className="material-symbols-outlined text-sm">campaign</span>
              Announcements
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC USER TAGS PILLS BAR (Only displays tags belonging to visible notes) */}
      {activeTab === 'Notes' && (availableTags.length > 0 || selectedTags.length > 0) && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none px-1">
          <button
            onClick={() => setSelectedTags([])}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedTags.length === 0
                ? 'bg-on-surface text-white shadow-xs'
                : 'bg-white text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-low'
            }`}
          >
            All Notes
          </button>
          
          {availableTags.map(tag => {
            const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
            const isSelected = selectedTags.includes(cleanTag);
            return (
              <button
                key={cleanTag}
                onClick={() => toggleTag(cleanTag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'bg-white text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-low'
                }`}
              >
                <span>{cleanTag}</span>
                {isSelected && <span className="material-symbols-outlined text-xs">close</span>}
              </button>
            );
          })}

          {/* Add custom tag search pill */}
          <div className="relative min-w-[90px]">
            <input
              type="text"
              placeholder="+ Tag filter"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              className="bg-white border border-dashed border-outline-variant/60 rounded-full px-2.5 py-0.5 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* EXPANDABLE FILTER DRAWER */}
      {activeTab === 'Notes' && showFilterDrawer && (
        <div className="bg-white rounded-2xl p-3.5 border border-outline-variant/40 shadow-xs animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-outline">Filter Workspace</h3>
            <button
              onClick={() => {
                setPriorityFilter('');
                setAgingFilter('');
                setShowFavoritesOnly(false);
                setShowArchived(false);
                setSelectedTags([]);
              }}
              className="text-xs text-primary font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Priority Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Priority</label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
              >
                <option value="">All Priorities</option>
                <option value="High">🔴 High Priority</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🟢 Low Priority</option>
              </select>
            </div>

            {/* Aging Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Aging Status</label>
              <select
                value={agingFilter}
                onChange={e => setAgingFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="New">🟢 New (Today)</option>
                <option value="Aging">🟡 Aging (1-3 Days)</option>
                <option value="Aged">🔴 Aged (&gt;3 Days)</option>
              </select>
            </div>

            {/* Quick Toggles */}
            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={showFavoritesOnly}
                  onChange={e => setShowFavoritesOnly(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  Starred Only
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-slate-500 text-sm">archive</span>
                  Show Archived
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BATCH MULTI-SELECT TOOLBAR */}
      {isBatchActive && (
        <div className="sticky top-3 z-[500] bg-on-surface text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-slide-up border border-white/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onClearSelection}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-300"
              title="Clear selection"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <span className="text-xs font-bold font-headline tracking-wide">
              {selectedIds.length} Note{selectedIds.length > 1 ? 's' : ''} Selected
            </span>
            <button
              onClick={onSelectAll}
              className="text-xs text-primary-container font-semibold hover:underline border-l border-white/20 pl-3"
            >
              Select All ({totalCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={onBatchAssign}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Assign
            </button>

            <button
              onClick={onBatchChangePriority}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">priority_high</span>
              Priority
            </button>

            <button
              onClick={onBatchAddTag}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">label</span>
              Tag
            </button>

            <button
              onClick={onBatchArchive}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">archive</span>
              Archive
            </button>

            <button
              onClick={onBatchDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-error/80 hover:bg-error rounded-xl text-xs font-bold text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
