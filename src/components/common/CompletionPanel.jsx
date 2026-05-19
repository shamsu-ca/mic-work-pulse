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

export default function CompletionPanel({ item, profiles = [], currentUser, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    description: `Follow-up: ${item?.title ?? ''}`,
    dueDate: tomorrow(),
    assigneeId: item?.assignee_id ?? '',
  });
  const [followUpError, setFollowUpError] = useState('');
  const [saving, setSaving] = useState(false);

  const resolution = getResolutionInfo(item);

  const followUpAssigneeOptions = (() => {
    if (currentUser?.role === 'Assignee') return profiles.filter(p => p.id === currentUser.id || p.manager === currentUser.name);
    if (currentUser?.role === 'Manager') return profiles.filter(p => p.manager === currentUser.name);
    return profiles;
  })();

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
      followUp: followUpEnabled ? followUpForm : null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
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
              <span className="text-sm text-gray-700">Create a follow-up {item?.type === 'Milestone' ? 'milestone' : 'task'}</span>
            </label>

            {followUpEnabled && (
              <div className="mt-3 space-y-2 pl-6">
                <div>
                  <input
                    type="text"
                    value={followUpForm.title}
                    onChange={e => setFollowUpForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Title *"
                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${followUpError && !followUpForm.title.trim() ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {followUpError && !followUpForm.title.trim() && (
                    <p className="text-xs text-red-500 mt-1">{followUpError}</p>
                  )}
                </div>
                <textarea
                  value={followUpForm.description}
                  onChange={e => setFollowUpForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Description"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <input
                  type="date"
                  value={followUpForm.dueDate}
                  onChange={e => setFollowUpForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {followUpAssigneeOptions.length > 0 && (
                  <select
                    value={followUpForm.assigneeId}
                    onChange={e => setFollowUpForm(p => ({ ...p, assigneeId: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Unassigned</option>
                    {followUpAssigneeOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
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
