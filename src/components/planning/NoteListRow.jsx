import React, { useState } from 'react';
import { parseNoteTitleAndBody, calculateAge, getAgeClass } from './NoteCard';

export default function NoteListRow({
  note,
  profiles,
  currentUser,
  isSelected,
  onToggleSelect,
  onEdit,
  onAssign,
  onTogglePin,
  onToggleFavorite,
  onArchive,
  onDelete
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { title, body } = parseNoteTitleAndBody(note);
  const ageStr = calculateAge(note.created_at);
  const creator = profiles?.find(p => p.id === note.created_by)?.name || 'Unknown';
  const assigneeName = profiles?.find(p => p.id === note.assignee_id)?.name;
  const tags = Array.isArray(note.tags) ? note.tags : [];

  const canManage = currentUser?.role === 'Admin' || 
    currentUser?.id === note.created_by || 
    (currentUser?.role === 'Manager' && profiles?.find(p => p.id === note.created_by)?.manager === currentUser?.name);

  return (
    <div className={`border-b border-surface-container-high transition-colors ${
      isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-low/50'
    }`}>
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Checkbox, Pin/Star & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note);
            }}
            className={`p-1 rounded transition-colors ${
              note.is_pinned ? 'text-amber-500' : 'text-outline/30 hover:text-amber-500'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: note.is_pinned ? "'FILL' 1" : "'FILL' 0" }}>
              keep
            </span>
          </button>

          <span className="font-bold text-sm text-on-surface truncate font-headline">
            {title}
          </span>

          {/* Tags */}
          <div className="hidden sm:flex items-center gap-1">
            {tags.slice(0, 2).map((tag, idx) => (
              <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[9px] text-outline font-bold">+{tags.length - 2}</span>
            )}
          </div>
        </div>

        {/* Right: Aging, Priority, Assignee, Creator, Quick Action Buttons */}
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          {note.priority && (
            <span className={`hidden md:inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              note.priority === 'High' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}>
              {note.priority}
            </span>
          )}

          {assigneeName && (
            <span className="hidden md:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">person</span>
              {assigneeName}
            </span>
          )}

          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getAgeClass(ageStr)}`}>
            {ageStr}
          </span>

          <span className="text-xs text-on-surface-variant hidden lg:inline-block font-medium">
            {creator}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(note)}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors"
              title="Edit Note"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>

            {canManage && (
              <button
                onClick={() => onDelete(note.id)}
                className="p-1 text-on-surface-variant hover:text-error transition-colors"
                title="Delete"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}

            <button
              onClick={() => onAssign(note)}
              className="flex items-center gap-1 ml-1 text-[10px] font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-2.5 py-1 rounded-lg transition-all uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[13px]">person_add</span>
              Assign
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDABLE BODY PREVIEW */}
      {isExpanded && body && (
        <div className="px-12 py-3 bg-surface-container-lowest/60 border-t border-dashed border-outline-variant/30 text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">
          {body}
        </div>
      )}
    </div>
  );
}
