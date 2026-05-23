import { useState } from 'react';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const LINK_TYPES = ['Continuation', 'Correction', 'Review', 'New Work'];

export default function FollowUpModal({ completedItem, profiles = [], onConfirm, onCancel }) {
  const assigneeName = profiles.find(p => p.id === completedItem?.assignee_id)?.name || 'Unassigned';

  const completedDate = completedItem?.completed_at
    ? new Date(completedItem.completed_at).toLocaleDateString()
    : '—';

  const isMilestone = completedItem?.type === 'Milestone';

  const [form, setForm] = useState({
    title: '',
    description: completedItem ? `Follow-up of: ${completedItem.title}` : '',
    assigneeId: completedItem?.assignee_id ?? '',
    priority: completedItem?.priority || 'Medium',
    linkType: 'Continuation',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm({
      title: form.title,
      description: form.description || null,
      assigneeId: form.assigneeId || null,
      dueDate: null,
      dueTime: null,
      priority: form.priority,
      linkType: form.linkType,
      type: isMilestone ? 'Milestone' : 'Task',
      container_id: completedItem?.container_id || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">
            Create Follow-up {isMilestone ? 'Milestone' : 'Task'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 space-y-0.5">
            <p><span className="font-medium text-gray-700">Source:</span> {completedItem?.title}</p>
            <p><span className="font-medium text-gray-700">Type:</span> {completedItem?.type || 'Task'}</p>
            <p><span className="font-medium text-gray-700">Completed by:</span> {assigneeName}</p>
            {completedItem?.status === 'Completed' && <p><span className="font-medium text-gray-700">On:</span> {completedDate}</p>}
          </div>

          {isMilestone && (
            <div className="bg-purple-50 border border-purple-200 text-purple-800 p-3 rounded-lg text-xs font-semibold">
              Note: This follow-up is locked to a **Milestone** inside the same project. Standalone tasks cannot be created.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Assignee (Same Assignee)</label>
              <input
                type="text"
                readOnly
                value={profiles.find(p => p.id === form.assigneeId)?.name || 'Unassigned'}
                className="w-full text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 focus:outline-none"
              />
            </div>
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
            disabled={saving || !form.title}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
