import React, { useState } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { X } from 'lucide-react';

export default function CreateModal({ isOpen, onClose, defaultType = 'Task' }) {
  const { profiles, containers, currentUser, addWorkItem, addSavedTask, addContainer } = useDataContext();
  
  const [entityType, setEntityType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [containerId, setContainerId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [estimatedHours] = useState('');
  const [priority, setPriority] = useState('3');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('daily');
  const [weeklyDays, setWeeklyDays] = useState(new Set([1]));
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [xMonthInterval, setXMonthInterval] = useState(2);
  const [recurrenceMode, setRecurrenceMode] = useState('strict');

  const [loading, setLoading] = useState(false);
  const safeProfiles = profiles || [];
  const assigneeList = (() => {
    if (currentUser?.role === 'Assignee') {
      return safeProfiles.filter(p => p.id === currentUser.id);
    }
    if (currentUser?.role === 'Manager') {
      return safeProfiles.filter(p => p.id === currentUser.id || p.manager === currentUser.name);
    }
    return safeProfiles;
  })();
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
        if (recurringType === 'daily')       recurrenceRule = { type: 'daily', recurrence_mode: recurrenceMode };
        else if (recurringType === 'weekly') recurrenceRule = { type: 'weekly', weekly_days: [...weeklyDays].sort((a, b) => a - b), recurrence_mode: recurrenceMode };
        else if (recurringType === 'monthly') recurrenceRule = { type: 'monthly', monthly_day: monthlyDay, recurrence_mode: recurrenceMode };
        else if (recurringType === 'x_monthly') recurrenceRule = { type: 'x_monthly', x_month_interval: xMonthInterval, monthly_day: monthlyDay, recurrence_mode: recurrenceMode };
      }

      const itemData = {
        title,
        description,
        type: entityType,
        assignee_id: assigneeId || null,
        expected_date: isRecurring ? null : (expectedDate || null),
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        priority: parseInt(priority, 10),
        status: 'Assigned',
        created_by: currentUser.id,
      };
      if (isRecurring) {
        await addSavedTask({ ...itemData, is_recurring: true, recurrence_rule: recurrenceRule, is_active: true });
      } else {
        await addWorkItem({ ...itemData, container_id: containerId || null, is_recurring: false });
      }
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
                    {assigneeList.map(p => (
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
                    <div className="flex-column gap-2 mt-2">
                       <select className="filter-select" value={recurringType} onChange={e => setRecurringType(e.target.value)}>
                         <option value="daily">Daily</option>
                         <option value="weekly">Weekly</option>
                         <option value="monthly">Monthly</option>
                         <option value="x_monthly">Every X Months</option>
                       </select>

                       {recurringType === 'weekly' && (
                         <div className="flex-row gap-1" style={{ flexWrap: 'wrap' }}>
                           {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                             <button key={i} type="button"
                               onClick={() => setWeeklyDays(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; })}
                               style={{
                                 padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px',
                                 border: '1px solid', cursor: 'pointer',
                                 background: weeklyDays.has(i) ? 'var(--primary)' : 'transparent',
                                 color: weeklyDays.has(i) ? 'white' : 'var(--text-color)',
                                 borderColor: weeklyDays.has(i) ? 'var(--primary)' : 'var(--outline-variant)',
                               }}
                             >{d}</button>
                           ))}
                         </div>
                       )}
                       {(recurringType === 'monthly' || recurringType === 'x_monthly') && (
                         <input type="number" min="1" max="31" className="input-base" value={monthlyDay} onChange={e => setMonthlyDay(parseInt(e.target.value) || 1)} placeholder="Day of month (1-31)" />
                       )}
                       {recurringType === 'x_monthly' && (
                         <input type="number" min="1" className="input-base" value={xMonthInterval} onChange={e => setXMonthInterval(parseInt(e.target.value) || 1)} placeholder="Repeat every X months" />
                       )}
                       <div className="flex-row gap-1" style={{ marginTop: '2px' }}>
                         {['strict', 'flexible'].map(m => (
                           <button key={m} type="button"
                             onClick={() => setRecurrenceMode(m)}
                             style={{
                               flex: 1, padding: '4px 0', fontSize: '11px', fontWeight: 'bold',
                               borderRadius: '6px', border: '1px solid', cursor: 'pointer',
                               textTransform: 'capitalize',
                               background: recurrenceMode === m ? 'var(--primary)' : 'transparent',
                               color: recurrenceMode === m ? 'white' : 'var(--text-muted)',
                               borderColor: recurrenceMode === m ? 'var(--primary)' : 'var(--outline-variant)',
                             }}
                           >{m}</button>
                         ))}
                       </div>
                    </div>
                 )}
              </div>

              {!isRecurring && (
                <div className="flex-column gap-1">
                  <label className="label-sm text-muted">Expected Date</label>
                  <input type="date" className="input-base" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
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
