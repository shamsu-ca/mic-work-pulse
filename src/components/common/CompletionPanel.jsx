import { useState } from 'react';

function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getResolutionInfo(item) {
  if (!item?.expected_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(item.expected_date + 'T00:00:00');
  const diff = Math.round((today - due) / 86400000);
  if (diff < 0) return { label: `Early by ${Math.abs(diff)}d`, color: 'bg-green-100 text-green-800' };
  if (diff === 0) return { label: 'On Time', color: 'bg-blue-100 text-blue-800' };
  return { label: `Late by ${diff}d`, color: 'bg-red-100 text-red-800' };
}

export default function CompletionPanel({ item, profiles = [], onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    description: item ? `Follow-up of: ${item.title}` : '',
    dueDate: tomorrow(),
    assigneeId: item?.assignee_id ?? '',
    priority: item?.priority || 'Medium',
    linkType: 'Continuation',
  });
  const [followUpError, setFollowUpError] = useState('');
  const [saving, setSaving] = useState(false);

  const resolution = getResolutionInfo(item);
  const isMilestone = item?.type === 'Milestone';

  const handleConfirm = async () => {
    if (followUpEnabled) {
      if (!followUpForm.title.trim()) {
        setFollowUpError('Title is required');
        return;
      }
      if (!followUpForm.dueDate) {
        setFollowUpError('Due date is required');
        return;
      }
    }
    setFollowUpError('');
    setSaving(true);
    await onConfirm({
      note: note.trim() || null,
      tag: null,
      followUp: followUpEnabled ? {
        title: followUpForm.title,
        description: followUpForm.description,
        dueDate: followUpForm.dueDate,
        dueTime: null,
        assigneeId: followUpForm.assigneeId,
        priority: followUpForm.priority,
        linkType: followUpForm.linkType,
        type: isMilestone ? 'Milestone' : 'Task',
        container_id: item?.container_id || null,
      } : null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 p-4 z-[2000] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Complete Work</h2>
          {resolution && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${resolution.color}`}>
              {resolution.label}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Task</p>
            <p className="text-sm text-gray-700 font-medium">{item?.title}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Completion Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Any remarks or observations..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={followUpEnabled}
                onChange={e => { setFollowUpEnabled(e.target.checked); setFollowUpError(''); }}
                className="rounded"
              />
              <span className="text-sm text-gray-700 font-semibold">Add Follow-up</span>
            </label>

            {followUpEnabled && (
              <div className="mt-3 space-y-3 pl-6 border-l-2 border-indigo-100">
                {isMilestone && (
                  <div className="bg-purple-50 border border-purple-200 text-purple-800 p-2.5 rounded-lg text-[10px] font-semibold leading-relaxed">
                    Note: Locked to a **Milestone** inside the same project.
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Title *</label>
                  <input
                    type="text"
                    value={followUpForm.title}
                    onChange={e => setFollowUpForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Title"
                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${followUpError && !followUpForm.title.trim() ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {followUpError && !followUpForm.title.trim() && (
                    <p className="text-xs text-red-500 mt-1">{followUpError}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                  <textarea
                    value={followUpForm.description}
                    onChange={e => setFollowUpForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Due Date *</label>
                  <input
                    type="date"
                    value={followUpForm.dueDate}
                    onChange={e => setFollowUpForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Priority</label>
                    <select
                      value={followUpForm.priority}
                      onChange={e => setFollowUpForm(p => ({ ...p, priority: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Assignee (Same Assignee)</label>
                    <input
                      type="text"
                      readOnly
                      value={profiles.find(p => p.id === followUpForm.assigneeId)?.name || 'Unassigned'}
                      className="w-full text-sm border border-gray-200 bg-slate-50 text-gray-500 rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Completing...' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
