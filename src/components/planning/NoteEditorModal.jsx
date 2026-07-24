import React, { useState, useRef } from 'react';
import { COLOR_OPTIONS } from './NoteCard';

export default function NoteEditorModal({ note, onClose, onSave, onAssign, profiles, currentUser }) {
  const isNew = !note || !note.id;

  const initialContent = note ? (note.description || note.title || '') : '';
  const initialTitle = note ? (note.title || '') : '';

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [assigneeId, setAssigneeId] = useState(note?.assignee_id || '');
  const [priority, setPriority] = useState(note?.priority || 'Medium');
  const [color, setColor] = useState(note?.color || 'default');
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [isFavorite, setIsFavorite] = useState(note?.is_favorite || false);
  const [tags, setTags] = useState(Array.isArray(note?.tags) ? note.tags : []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef(null);

  // Formatting helpers for textarea selection
  const applyFormat = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  const insertLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 50);
  };

  const handleAddTag = (tagToAdd) => {
    const clean = tagToAdd.startsWith('#') ? tagToAdd : `#${tagToAdd}`;
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput.trim());
      setTagInput('');
    }
  };

  const handleSave = async (andAssign = false) => {
    const trimmedContent = content.trim();
    if (!trimmedContent && !title.trim()) return;

    setSaving(true);

    // Extract title from first line if explicit title is empty
    let finalTitle = title.trim();
    if (!finalTitle && trimmedContent) {
      const firstLine = trimmedContent.split('\n')[0].replace(/^#+\s*/, '').replace(/^[*\-+]\s*/, '').trim();
      finalTitle = firstLine || 'Untitled Note';
    }

    const payload = {
      title: finalTitle || 'Untitled Note',
      description: trimmedContent,
      assignee_id: assigneeId || null,
      priority,
      color,
      is_pinned: isPinned,
      is_favorite: isFavorite,
      tags,
      in_planning_pool: true,
      updated_at: new Date().toISOString()
    };

    let savedItem = null;
    if (isNew) {
      const res = await onSave(payload);
      savedItem = res?.data ? res.data[0] : null;
    } else {
      await onSave(note.id, payload);
      savedItem = { ...note, ...payload };
    }

    setSaving(false);

    if (andAssign && onAssign && savedItem) {
      onAssign(savedItem);
    }

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[3000] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={() => handleSave(false)}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-outline-variant/30 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* APPLE NOTES TOP CONTROL BAR */}
        <div className="px-6 py-3 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Done
            </button>
            <span className="text-xs text-outline font-medium hidden sm:inline">
              {isNew ? 'New Note' : 'Editing Note'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Assignee Tag Selector */}
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              title="Tag Assignee on Note"
            >
              <option value="">👤 Unassigned</option>
              {(profiles || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Star Favorite Toggle */}
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl transition-colors ${
                isFavorite ? 'bg-amber-100 text-amber-600' : 'hover:bg-surface-container text-on-surface-variant'
              }`}
              title="Star Note"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
            </button>

            {/* Pin Toggle */}
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-xl transition-colors ${
                isPinned ? 'bg-amber-100 text-amber-700' : 'hover:bg-surface-container text-on-surface-variant'
              }`}
              title="Pin Note"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isPinned ? "'FILL' 1" : "'FILL' 0" }}>
                keep
              </span>
            </button>

            {/* Priority Selector */}
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="High">🔴 High Priority</option>
              <option value="Medium">🟡 Medium Priority</option>
              <option value="Low">🟢 Low Priority</option>
            </select>

            {/* Convert / Assign button */}
            <button
              onClick={() => handleSave(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all border border-primary/30 uppercase tracking-wider"
              title="Convert this note into a Task or Project"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span className="hidden sm:inline">Assign</span>
            </button>

            {/* Save & Close */}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-1.5 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* APPLE NOTES FORMATTING TOOLBAR */}
        <div className="px-6 py-2 bg-surface-container-low border-b border-outline-variant/20 flex items-center gap-1 overflow-x-auto scrollbar-none text-on-surface-variant">
          <button onClick={() => applyFormat('**', '**')} className="p-1.5 hover:bg-white rounded-lg font-bold text-xs w-7 h-7 flex items-center justify-center" title="Bold">B</button>
          <button onClick={() => applyFormat('*', '*')} className="p-1.5 hover:bg-white rounded-lg italic text-xs w-7 h-7 flex items-center justify-center" title="Italic">I</button>
          <button onClick={() => applyFormat('~', '~')} className="p-1.5 hover:bg-white rounded-lg line-through text-xs w-7 h-7 flex items-center justify-center" title="Strikethrough">S</button>
          
          <div className="h-4 w-px bg-outline-variant/40 mx-1" />

          <button onClick={() => insertLinePrefix('# ')} className="p-1.5 hover:bg-white rounded-lg font-bold text-xs px-2" title="Heading 1">H1</button>
          <button onClick={() => insertLinePrefix('## ')} className="p-1.5 hover:bg-white rounded-lg font-bold text-xs px-2" title="Heading 2">H2</button>
          
          <div className="h-4 w-px bg-outline-variant/40 mx-1" />

          <button onClick={() => insertLinePrefix('- ')} className="p-1.5 hover:bg-white rounded-lg flex items-center justify-center" title="Bullet List">
            <span className="material-symbols-outlined text-base">format_list_bulleted</span>
          </button>
          <button onClick={() => insertLinePrefix('1. ')} className="p-1.5 hover:bg-white rounded-lg flex items-center justify-center" title="Numbered List">
            <span className="material-symbols-outlined text-base">format_list_numbered</span>
          </button>
          <button onClick={() => insertLinePrefix('[ ] ')} className="p-1.5 hover:bg-white rounded-lg flex items-center justify-center" title="Checklist">
            <span className="material-symbols-outlined text-base">check_box</span>
          </button>
          <button onClick={() => insertLinePrefix('> ')} className="p-1.5 hover:bg-white rounded-lg flex items-center justify-center" title="Quote">
            <span className="material-symbols-outlined text-base">format_quote</span>
          </button>

          <div className="h-4 w-px bg-outline-variant/40 mx-1" />

          {/* Color Picker Palette */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] uppercase font-bold text-outline mr-1">Color:</span>
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`w-5 h-5 rounded-full ${c.bg} ${c.border} border hover:scale-110 transition-transform ${
                  color === c.id ? 'ring-2 ring-primary ring-offset-1' : ''
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* EDITOR BODY */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {/* Explicit Title */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-xl font-bold font-headline text-on-surface bg-transparent focus:outline-none placeholder:text-outline/50 border-b border-outline-variant/20 pb-2"
          />

          {/* Body Textarea */}
          <textarea
            ref={textareaRef}
            placeholder="Start typing your note here... Use formatting, checklist items ([ ]), or tags (#Meeting, #HR)..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full flex-1 bg-transparent text-sm font-medium text-on-surface focus:outline-none resize-none leading-relaxed placeholder:text-outline/40 font-mono"
          />

          {/* TAGS MANAGER BAR */}
          <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Tags:</span>
              {tags.map(tag => (
                <span 
                  key={tag} 
                  className="bg-primary/10 text-primary border border-primary/30 rounded-full px-2.5 py-0.5 text-xs font-bold flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-error">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="+ Add tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="bg-surface-container-low border border-dashed border-outline-variant/60 rounded-full px-3 py-0.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
