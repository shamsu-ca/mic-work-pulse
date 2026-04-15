import React, { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { X } from 'lucide-react';

export default function CreateModal({ isOpen, onClose, defaultType = 'Task' }) {
  const { profiles, containers, currentUser, addWorkItem, addContainer } = useDataContext();
  
  const [entityType, setEntityType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [containerId, setContainerId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priority, setPriority] = useState('3');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('daily');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringDay, setRecurringDay] = useState(0); // 0=Sun, 1=Mon...
  const [recurringDate, setRecurringDate] = useState(1); // 1-31

  const [loading, setLoading] = useState(false);
  const safeProfiles = profiles || [];
  const safeContainers = containers || [];

  if (!isOpen) return null;

  const isContainer = entityType === 'Project' || entityType === 'Event';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isContainer) {
      await addContainer({
        title,
        type: entityType,
        created_by: currentUser.id
      });
    } else {
      
      let recurrenceRule = null;
      if (isRecurring) {
         if (recurringType === 'daily') recurrenceRule = { type: 'daily' };
         else if (recurringType === 'every_x_days') recurrenceRule = { type: 'every_x_days', interval: recurringInterval };
         else if (recurringType === 'weekly') recurrenceRule = { type: 'weekly', day: recurringDay };
         else if (recurringType === 'monthly') recurrenceRule = { type: 'monthly', date: recurringDate };
         else if (recurringType === 'every_x_months') recurrenceRule = { type: 'every_x_months', interval: recurringInterval, date: recurringDate };
      }

      await addWorkItem({
        title,
        description,
        type: entityType,
        assignee_id: assigneeId || null,
        container_id: containerId || null,
        expected_date: isRecurring ? null : (expectedDate || null),
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        priority: parseInt(priority, 10),
        status: 'Assigned',
        in_planning_pool: isRecurring ? false : false, // Recurring tasks live as templates, separate logic
        is_recurring: isRecurring,
        recurrence_rule: recurrenceRule,
        created_by: currentUser.id,
        is_active: true
      });
    }

    setLoading(false);
    onClose();
    // Reset basic fields
    setTitle('');
    setDescription('');
    setIsRecurring(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="surface-card flex-column gap-4" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="title-sm m-0">Create New Item</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-column gap-3">
          <div className="flex-column gap-1">
            <label className="label-sm text-muted">Item Type</label>
            <select className="filter-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <optgroup label="Containers">
                <option value="Project">Project</option>
                <option value="Event">Event</option>
              </optgroup>
              <optgroup label="Work Items">
                <option value="Task">Task</option>
                <option value="Subtask">Subtask</option>
                <option value="Milestone">Milestone</option>
                <option value="Checklist">Checklist</option>
              </optgroup>
            </select>
          </div>

          <div className="flex-column gap-1">
            <label className="label-sm text-muted">Title</label>
            <input type="text" className="input-base" required value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {!isContainer && (
            <>
              <div className="flex-column gap-1">
                <label className="label-sm text-muted">Description (Optional)</label>
                <textarea className="input-base" rows={2} value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>

              <div className="flex-row gap-3">
                <div className="flex-column gap-1" style={{ flex: 1 }}>
                  <label className="label-sm text-muted">Assignee</label>
                  <select className="input-base" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {safeProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                {!isRecurring && (
                  <div className="flex-column gap-1" style={{ flex: 1 }}>
                    <label className="label-sm text-muted">Parent Project</label>
                    <select className="input-base" value={containerId} onChange={e => setContainerId(e.target.value)}>
                      <option value="">None (Standalone)</option>
                      {safeContainers.filter(c => c.type === 'Project' || c.type === 'Event').map(c => (
                        <option key={c.id} value={c.id}>{c.type}: {c.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Recurring Settings */}
              <div className="surface-card flex-column gap-2" style={{ padding: '0.75rem', background: 'var(--surface-container-highest)' }}>
                 <label className="label-sm text-muted flex-row align-center gap-2" style={{cursor: 'pointer'}}>
                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                    Make this a Recurring Task
                 </label>
                 
                 {isRecurring && (
                    <div className="flex-row gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                       <select className="filter-select" value={recurringType} onChange={e => setRecurringType(e.target.value)} style={{ flex: 1 }}>
                         <option value="daily">Daily</option>
                         <option value="every_x_days">Every X Days</option>
                         <option value="weekly">Weekly</option>
                         <option value="monthly">Monthly</option>
                         <option value="every_x_months">Every X Months</option>
                       </select>

                       {(recurringType === 'every_x_days' || recurringType === 'every_x_months') && (
                         <input type="number" min="1" className="input-base" style={{width: '80px'}} value={recurringInterval} onChange={e => setRecurringInterval(e.target.value)} placeholder="Intvl" />
                       )}
                       {recurringType === 'weekly' && (
                         <select className="filter-select" value={recurringDay} onChange={e => setRecurringDay(parseInt(e.target.value))}>
                           <option value={0}>Sunday</option>
                           <option value={1}>Monday</option>
                           <option value={2}>Tuesday</option>
                           <option value={3}>Wednesday</option>
                           <option value={4}>Thursday</option>
                           <option value={5}>Friday</option>
                           <option value={6}>Saturday</option>
                         </select>
                       )}
                       {(recurringType === 'monthly' || recurringType === 'every_x_months') && (
                         <input type="number" min="1" max="31" className="input-base" style={{width: '100px'}} value={recurringDate} onChange={e => setRecurringDate(parseInt(e.target.value))} placeholder="Date (1-31)" title="Date of the month" />
                       )}
                    </div>
                 )}
              </div>

              {!isRecurring && (
                <div className="flex-row gap-3">
                  <div className="flex-column gap-1" style={{ flex: 1 }}>
                    <label className="label-sm text-muted">Expected Date</label>
                    <input type="date" className="input-base" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                  </div>
                  <div className="flex-column gap-1" style={{ flex: 1 }}>
                    <label className="label-sm text-muted">Est. Hours</label>
                    <input type="number" step="0.5" className="input-base" placeholder="e.g. 2.5" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex-column gap-1">
                <label className="label-sm text-muted">Priority</label>
                <select className="filter-select" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="1">1 - High (Urgent)</option>
                  <option value="2">2 - Medium</option>
                  <option value="3">3 - Normal</option>
                </select>
              </div>
            </>
          )}

          <div className="flex-row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-tertiary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
