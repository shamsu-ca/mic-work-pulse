import React, { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { X } from 'lucide-react';

export default function ScheduleModal({ isOpen, onClose, taskItem }) {
  const { profiles, updateWorkItem } = useDataContext();
  const safeProfiles = profiles || [];
  
  const [assigneeId, setAssigneeId] = useState(taskItem?.assignee_id || '');
  const [expectedDate, setExpectedDate] = useState(taskItem?.expected_date || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !taskItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    await updateWorkItem(taskItem.id, {
      assignee_id: assigneeId || null,
      expected_date: expectedDate || null,
      in_planning_pool: false,
      status: 'Assigned' // Moves it actively out of the pool
    });

    setLoading(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="surface-card flex-column gap-4" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="title-sm m-0">Schedule Task</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '0.5rem', backgroundColor: 'var(--surface-container)', borderRadius: '4px' }}>
          <span className="label-sm text-muted">Scheduling:</span>
          <h4 className="title-sm m-0">{taskItem.title}</h4>
        </div>

        <form onSubmit={handleSubmit} className="flex-column gap-4">
          <div className="flex-column gap-1">
            <label className="label-sm text-muted">Assign To</label>
            <select className="filter-select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} required>
              <option value="">Select Assignee...</option>
              {safeProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex-column gap-1">
            <label className="label-sm text-muted">Execution Date</label>
            <input type="date" className="input-base" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} required />
          </div>

          <div className="flex-row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-tertiary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
