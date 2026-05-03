import { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';

export default function AbsenceModal({ onClose, targetUserId = null }) {
  const { currentUser, profiles, addAbsence } = useDataContext();
  const today = new Date().toISOString().split('T')[0];

  const isAdmin = currentUser?.role === 'Admin';
  const [userId, setUserId] = useState(targetUserId || currentUser?.id || '');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const assignees = (profiles || []).filter(p => p.role !== 'Admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return setError('Select a user.');
    if (toDate < fromDate) return setError('End date must be on or after start date.');
    setSaving(true);
    setError('');
    const { error: err } = await addAbsence({
      user_id: userId,
      from_date: fromDate,
      to_date: toDate,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (err) setError(err.message || 'Failed to save absence.');
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-outline-variant/30">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>event_busy</span>
            </div>
            <h2 className="font-bold text-on-surface">Mark Absent</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* User selector — admin only */}
          {isAdmin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Staff Member</label>
              <select
                className="border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/40 bg-white"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                required
              >
                <option value="">Select person…</option>
                {assignees.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">From Date</label>
            <input
              type="date"
              required
              className="border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value); }}
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">To Date</label>
            <input
              type="date"
              required
              min={fromDate}
              className="border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Reason <span className="font-normal normal-case text-outline">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Medical leave, Training…"
              className="border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-error font-medium">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold border border-outline-variant/40 text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-bold bg-purple-600 text-white rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Confirm Absence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
