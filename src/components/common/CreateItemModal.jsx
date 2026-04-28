import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../../context/SupabaseDataContext';

export default function CreateItemModal({ onClose }) {
  const { addWorkItem, addSavedTask, profiles, currentUser, addAnnouncement } = useDataContext();
  const navigate = useNavigate();
  const [step, setStep] = useState('choose'); // 'choose' | 'task' | 'plan' | 'notification'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selfOnly = currentUser?.role === 'Assignee';

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState(selfOnly ? (currentUser?.id || '') : '');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskEstMins, setTaskEstMins] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceDay, setRecurrenceDay] = useState('1');
  const [recurrenceDate, setRecurrenceDate] = useState('1');
  const [recurrenceInterval, setRecurrenceInterval] = useState('7');

  // Plan form
  const [planTitle, setPlanTitle] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planAssignee, setPlanAssignee] = useState(selfOnly ? (currentUser?.id || '') : '');
  const [planPriority, setPlanPriority] = useState('Medium');
  const [planEstMins, setPlanEstMins] = useState('');

  // Notification form
  const [notifType, setNotifType] = useState('Text');
  const [notifForm, setNotifForm] = useState({ message: '', event_date: '', event_time: '', staff_group: 'Both' });

  const safeProfiles = profiles || [];
  const assigneeList = (() => {
    if (currentUser?.role === 'Assignee') {
      return safeProfiles.filter(p => p.id === currentUser.id);
    }
    if (currentUser?.role === 'Manager') {
      return safeProfiles.filter(p => p.id === currentUser.id || p.manager === currentUser.name);
    }
    return safeProfiles.filter(p => p.role !== 'Admin');
  })();

  const buildRecurrenceRule = () => {
    if (recurrenceType === 'daily') return { type: 'daily' };
    if (recurrenceType === 'weekly') return { type: 'weekly', day: Number(recurrenceDay) };
    if (recurrenceType === 'monthly') return { type: 'monthly', date: Number(recurrenceDate) };
    if (recurrenceType === 'every_x_days') return { type: 'every_x_days', interval: Number(recurrenceInterval) };
    if (recurrenceType === 'every_x_months') return { type: 'every_x_months', interval: Number(recurrenceInterval) };
    return { type: 'daily' };
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    const taskBase = {
      title: taskTitle,
      description: taskDesc,
      assignee_id: taskAssignee || null,
      priority: taskPriority,
      status: 'Assigned',
      type: 'Task',
      ...(taskEstMins ? { estimated_hours: Number(taskEstMins) } : {}),
    };
    if (isRecurring) {
      await addSavedTask({ ...taskBase, expected_date: null, is_recurring: true, recurrence_rule: buildRecurrenceRule(), is_active: true });
    } else {
      await addWorkItem({ ...taskBase, expected_date: taskDate || null, is_recurring: false });
    }
    setLoading(false);
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    await addWorkItem({
      title: planTitle,
      description: planDesc,
      assignee_id: planAssignee || null,
      priority: planPriority,
      status: 'Assigned',
      type: 'Plan',
      in_planning_pool: true,
      is_recurring: false,
      ...(planEstMins ? { estimated_hours: Number(planEstMins) } : {}),
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    await addAnnouncement({
      title: notifType === 'Program' ? notifForm.message : 'Text',
      message: notifType === 'Text' ? notifForm.message : null,
      event_date: notifForm.event_date,
      event_time: notifType === 'Program' ? (notifForm.event_time || null) : null,
      type: notifType,
      staff_group: notifForm.staff_group
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-2xl">
          <span className="material-symbols-outlined text-green-500 text-5xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          <p className="font-bold text-lg text-on-surface font-headline">Created successfully!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/20 w-full max-w-md" onClick={e => e.stopPropagation()}>

        {step === 'choose' && (
          <>
            <div className="px-6 py-5 border-b border-surface-container">
              <h2 className="font-bold text-lg font-headline text-on-surface">Create New</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">What would you like to add?</p>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep('task')}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-outline-variant/30 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>assignment</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-on-surface text-sm">Task</p>
                  <p className="text-[10px] text-on-surface-variant">Assign to work pipeline</p>
                </div>
              </button>
              <button
                onClick={() => setStep('plan')}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-outline-variant/30 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <span className="material-symbols-outlined text-indigo-600 text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>account_tree</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-on-surface text-sm">Plan</p>
                  <p className="text-[10px] text-on-surface-variant">Add to planning pool</p>
                </div>
              </button>
              {currentUser?.role === 'Admin' && (
                <div className="col-span-2 mt-2">
                  <button
                    onClick={() => setStep('notification')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-outline-variant/30 hover:border-pink-300 hover:bg-pink-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                        <span className="material-symbols-outlined text-pink-600 text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>campaign</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-on-surface text-sm leading-none">Broadcast Notification</p>
                        <p className="text-[10px] text-on-surface-variant mt-1.5 leading-none">Alert staff immediately</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-pink-500 transition-colors text-[20px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 pb-5">
              <button onClick={onClose} className="w-full py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
            </div>
          </>
        )}

        {step === 'task' && (
          <form onSubmit={handleCreateTask}>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-container">
              <button type="button" onClick={() => setStep('choose')} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h2 className="font-bold text-lg font-headline text-on-surface">New Task</h2>
                <p className="text-xs text-on-surface-variant">Will be added to the Work Pipeline</p>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Title *</label>
                <input required className={inputCls} placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Description</label>
                <textarea className={inputCls + " resize-none"} rows={2} placeholder="Optional details..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assignee</label>
                  <select className={inputCls} value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {assigneeList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority</label>
                  <select className={inputCls} value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${isRecurring ? 'bg-primary' : 'bg-outline-variant'}`}
                    onClick={() => setIsRecurring(v => !v)}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs font-bold text-on-surface">Recurring Task</span>
                </label>
              </div>
              {isRecurring ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Recurrence</label>
                  <select className={inputCls} value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="every_x_days">Every X Days</option>
                    <option value="every_x_months">Every X Months</option>
                  </select>
                  {recurrenceType === 'weekly' && (
                    <select className={inputCls} value={recurrenceDay} onChange={e => setRecurrenceDay(e.target.value)}>
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  )}
                  {recurrenceType === 'monthly' && (
                    <input type="number" min="1" max="31" placeholder="Day of month (1-31)" className={inputCls} value={recurrenceDate} onChange={e => setRecurrenceDate(e.target.value)} />
                  )}
                  {(recurrenceType === 'every_x_days' || recurrenceType === 'every_x_months') && (
                    <input type="number" min="1" placeholder={recurrenceType === 'every_x_days' ? 'Every X days' : 'Every X months'} className={inputCls} value={recurrenceInterval} onChange={e => setRecurrenceInterval(e.target.value)} />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Due Date</label>
                    <input type="date" className={inputCls} value={taskDate} onChange={e => setTaskDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Est. Time (min)</label>
                    <input type="number" min="0" placeholder="e.g. 90" className={inputCls} value={taskEstMins} onChange={e => setTaskEstMins(e.target.value)} />
                  </div>
                </div>
              )}
              {isRecurring && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Est. Time (min)</label>
                  <input type="number" min="0" placeholder="e.g. 90" className={inputCls} value={taskEstMins} onChange={e => setTaskEstMins(e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-5 border-t border-surface-container pt-4">
              <button type="button" className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">add</span>{loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        )}

        {step === 'plan' && (
          <form onSubmit={handleCreatePlan}>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-container">
              <button type="button" onClick={() => setStep('choose')} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h2 className="font-bold text-lg font-headline text-on-surface">New Plan</h2>
                <p className="text-xs text-on-surface-variant">Will be saved in the Planning Pool</p>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Plan Title *</label>
                <input required className={inputCls} placeholder="e.g. Q3 Budget Review" value={planTitle} onChange={e => setPlanTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Description</label>
                <textarea className={inputCls + " resize-none"} rows={2} placeholder="Optional..." value={planDesc} onChange={e => setPlanDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assignee</label>
                  <select className={inputCls} value={planAssignee} onChange={e => setPlanAssignee(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {assigneeList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority</label>
                  <select className={inputCls} value={planPriority} onChange={e => setPlanPriority(e.target.value)}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Est. Time (min)</label>
                <input type="number" min="0" placeholder="e.g. 120" className={inputCls} value={planEstMins} onChange={e => setPlanEstMins(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 border-t border-surface-container pt-4">
              <button type="button" className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">account_tree</span>{loading ? 'Saving...' : 'Save to Planning Pool'}
              </button>
            </div>
          </form>
        )}

        {step === 'notification' && (
          <form onSubmit={handleCreateNotification}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep('choose')} className="text-on-surface-variant hover:text-on-surface flex items-center justify-center">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                  <h2 className="font-bold text-lg font-headline text-on-surface leading-tight">New Notification</h2>
                  <p className="text-[10px] text-on-surface-variant">Broadcast to staff directly</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { onClose(); navigate('/planning', { state: { activeTab: 'Notifications' } }); }}
                className="text-[11px] font-bold text-pink-700 bg-pink-100 hover:bg-pink-200 px-3 py-1.5 rounded-lg transition-colors border border-pink-200 uppercase tracking-widest flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">settings</span> Manage
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Step 1: Select Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNotifType('Text')} className={`flex-1 py-2 text-sm font-bold border rounded-lg transition-all flex items-center justify-center gap-2 ${notifType === 'Text' ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/40 text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">campaign</span> Text
                  </button>
                  <button type="button" onClick={() => setNotifType('Program')} className={`flex-1 py-2 text-sm font-bold border rounded-lg transition-all flex items-center justify-center gap-2 ${notifType === 'Program' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-outline-variant/40 text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">event</span> Program
                  </button>
                </div>
              </div>

              {notifType === 'Text' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Message (Text Only) *</label>
                    <textarea required className={inputCls + " resize-none"} rows={3} value={notifForm.message} onChange={e => setNotifForm(f => ({...f, message: e.target.value}))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Show Until *</label>
                    <input type="date" required className={inputCls} value={notifForm.event_date} onChange={e => setNotifForm(f => ({...f, event_date: e.target.value}))} />
                  </div>
                </>
              )}

              {notifType === 'Program' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Subject *</label>
                    <input required className={inputCls} value={notifForm.message} onChange={e => setNotifForm(f => ({...f, message: e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Date *</label>
                      <input type="date" required className={inputCls} value={notifForm.event_date} onChange={e => setNotifForm(f => ({...f, event_date: e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Time (Optional)</label>
                      <input type="time" className={inputCls} value={notifForm.event_time} onChange={e => setNotifForm(f => ({...f, event_time: e.target.value}))} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Target Audience</label>
                <select className={inputCls + " py-2"} value={notifForm.staff_group} onChange={e => setNotifForm(f => ({...f, staff_group: e.target.value}))}>
                  <option value="Both">Both (All Staff)</option>
                  <option value="Office Staff">Office Staff</option>
                  <option value="Institution">Institution</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 border-t border-surface-container pt-4">
              <button type="button" className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
              <button type="submit" disabled={loading || !notifForm.message || !notifForm.event_date} className="flex-1 py-2.5 text-sm font-bold bg-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">campaign</span>{loading ? 'Sending...' : 'Broadcast'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
