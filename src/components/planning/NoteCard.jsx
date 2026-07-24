import React, { useState } from 'react';

export const NOTE_COLOR_MAP = {
  default: 'bg-white border-outline-variant/30 text-on-surface hover:shadow-md',
  yellow: 'bg-amber-50 border-amber-200/80 text-amber-950 hover:shadow-amber-100 hover:shadow-md',
  green: 'bg-emerald-50 border-emerald-200/80 text-emerald-950 hover:shadow-emerald-100 hover:shadow-md',
  blue: 'bg-sky-50 border-sky-200/80 text-sky-950 hover:shadow-sky-100 hover:shadow-md',
  purple: 'bg-purple-50 border-purple-200/80 text-purple-950 hover:shadow-purple-100 hover:shadow-md',
  pink: 'bg-rose-50 border-rose-200/80 text-rose-950 hover:shadow-rose-100 hover:shadow-md',
  slate: 'bg-slate-100 border-slate-300/80 text-slate-900 hover:shadow-slate-200 hover:shadow-md'
};

export const COLOR_OPTIONS = [
  { id: 'default', label: 'Default', bg: 'bg-white', border: 'border-slate-300' },
  { id: 'yellow', label: 'Amber', bg: 'bg-amber-100', border: 'border-amber-300' },
  { id: 'green', label: 'Mint', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  { id: 'blue', label: 'Sky', bg: 'bg-sky-100', border: 'border-sky-300' },
  { id: 'purple', label: 'Lavender', bg: 'bg-purple-100', border: 'border-purple-300' },
  { id: 'pink', label: 'Rose', bg: 'bg-rose-100', border: 'border-rose-300' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-200', border: 'border-slate-400' }
];

export const calculateAge = (dateStr) => {
  if (!dateStr) return 'New';
  const createdDate = new Date(dateStr);
  const today = new Date();
  const diffTime = today - createdDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'New';
  if (diffDays <= 3) return `Aging (${diffDays}d)`;
  return 'Aged';
};

export const getAgeClass = (ageStr) => {
  if (ageStr === 'New') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (ageStr.startsWith('Aging')) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-rose-100 text-rose-800 border-rose-300';
};

export function parseNoteTitleAndBody(note) {
  const fullText = (note.description || note.title || '').trim();
  if (!fullText) {
    return { title: note.title || 'Untitled Note', body: '' };
  }

  // Split by first newline
  const lines = fullText.split('\n');
  const firstLine = lines[0].replace(/^#+\s*/, '').replace(/^[*\-+]\s*/, '').trim();
  const title = note.title && note.title !== 'Untitled Note' ? note.title : (firstLine || 'Untitled Note');
  const bodyLines = note.title && note.title !== firstLine ? lines : lines.slice(1);
  const body = bodyLines.join('\n').trim();

  return { title, body };
}

export default function NoteCard({
  note,
  profiles,
  currentUser,
  isSelected,
  onToggleSelect,
  onEdit,
  onAssign,
  onTogglePin,
  onToggleFavorite,
  onChangeColor,
  onDuplicate,
  onArchive,
  onDelete,
  viewMode = 'cards'
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { title, body } = parseNoteTitleAndBody(note);
  const ageStr = calculateAge(note.created_at);
  const creator = profiles?.find(p => p.id === note.created_by)?.name || 'Unknown';
  const assigneeName = profiles?.find(p => p.id === note.assignee_id)?.name;
  
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const colorClass = NOTE_COLOR_MAP[note.color] || NOTE_COLOR_MAP.default;

  const canManage = currentUser?.role === 'Admin' || 
    currentUser?.id === note.created_by || 
    (currentUser?.role === 'Manager' && profiles?.find(p => p.id === note.created_by)?.manager === currentUser?.name);

  const isComfortable = viewMode === 'comfortable';

  return (
    <div 
      className={`group relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer ${colorClass} ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 border-primary shadow-lg' : ''
      } ${note.is_pinned ? 'border-amber-400/80 shadow-sm' : ''}`}
      onClick={() => onEdit(note)}
    >
      {/* CARD TOP HEADER: Selection Checkbox, Pin & Star */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(note.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-outline-variant text-primary focus:ring-primary/40 h-4 w-4 cursor-pointer"
            />

            {/* Priority Pill */}
            {note.priority && (
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                note.priority === 'High' 
                  ? 'bg-rose-100 text-rose-800 border-rose-200' 
                  : note.priority === 'Low' 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {note.priority}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {/* Star / Favorite */}
            <button
              onClick={() => onToggleFavorite(note)}
              className={`p-1 rounded-lg transition-transform hover:scale-110 ${
                note.is_favorite ? 'text-amber-500' : 'text-outline/40 opacity-0 group-hover:opacity-100 hover:text-amber-500'
              }`}
              title={note.is_favorite ? 'Unstar' : 'Star Note'}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: note.is_favorite ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
            </button>

            {/* Pin Note */}
            <button
              onClick={() => onTogglePin(note)}
              className={`p-1 rounded-lg transition-transform hover:scale-110 ${
                note.is_pinned ? 'text-amber-600' : 'text-outline/40 opacity-0 group-hover:opacity-100 hover:text-amber-600'
              }`}
              title={note.is_pinned ? 'Unpin' : 'Pin to Top'}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: note.is_pinned ? "'FILL' 1" : "'FILL' 0" }}>
                keep
              </span>
            </button>
          </div>
        </div>

        {/* NOTE TITLE */}
        <h3 className="font-bold text-sm font-headline text-on-surface line-clamp-2 leading-snug mb-1">
          {title}
        </h3>

        {/* NOTE BODY PREVIEW */}
        {body && (
          <p className={`text-xs text-on-surface-variant font-medium whitespace-pre-line leading-relaxed mb-3 ${
            isComfortable ? 'line-clamp-6' : 'line-clamp-3'
          }`}>
            {body}
          </p>
        )}

        {/* TAGS BAR */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {tags.map((tag, idx) => (
              <span 
                key={idx} 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high/60 text-primary border border-primary/20"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CARD FOOTER: Aging Badge, Creator & Action Toolbar */}
      <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-medium text-outline flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <span className={`font-bold px-1.5 py-0.5 rounded border text-[9px] ${getAgeClass(ageStr)}`}>
              {ageStr}
            </span>
            {assigneeName && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px]">person</span>
                {assigneeName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span>{creator}</span>
            <span>•</span>
            <span>{note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'Today'}</span>
          </div>
        </div>

        {/* HOVER QUICK ACTION TOOLBAR */}
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-between pt-1" 
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5 relative">
            {/* Color Palette Trigger */}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 text-on-surface-variant hover:text-primary rounded-lg hover:bg-white/50 transition-colors"
              title="Note Color"
            >
              <span className="material-symbols-outlined text-[16px]">palette</span>
            </button>

            {/* Palette Picker Popup */}
            {showColorPicker && (
              <div className="absolute bottom-7 left-0 bg-white shadow-xl rounded-xl p-2 border border-outline-variant/40 flex gap-1 z-30 animate-fade-in">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onChangeColor(note.id, c.id);
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full ${c.bg} ${c.border} border hover:scale-110 transition-transform ${
                      note.color === c.id ? 'ring-2 ring-primary' : ''
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            )}

            {/* Duplicate */}
            <button
              onClick={() => onDuplicate(note)}
              className="p-1 text-on-surface-variant hover:text-primary rounded-lg hover:bg-white/50 transition-colors"
              title="Duplicate Note"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>

            {canManage && (
              <>
                {/* Archive */}
                <button
                  onClick={() => onArchive(note)}
                  className="p-1 text-on-surface-variant hover:text-amber-600 rounded-lg hover:bg-white/50 transition-colors"
                  title={note.is_archived ? "Unarchive" : "Archive Note"}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {note.is_archived ? "unarchive" : "archive"}
                  </span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(note.id)}
                  className="p-1 text-on-surface-variant hover:text-error rounded-lg hover:bg-white/50 transition-colors"
                  title="Delete Note"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </>
            )}
          </div>

          {/* ASSIGN BUTTON (Promotes Note to Task/Project) */}
          <button
            onClick={() => onAssign(note)}
            className="flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/40 bg-primary/10 hover:bg-primary hover:text-white px-2.5 py-1 rounded-lg transition-all uppercase tracking-wider shadow-2xs"
          >
            <span className="material-symbols-outlined text-[13px]">person_add</span>
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
