import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';

function LeaveRequestModal({ profiles, onClose, onSave }) {
  const { checkTodayStartedOrCompletedRecurringTasks } = useDataContext();
  const [targetUserId, setTargetUserId] = useState('');
  const [leaveType, setLeaveType] = useState('Full Day');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!targetUserId) {
      alert("Please select a staff member.");
      return;
    }

    if (leaveType === 'Full Day') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr >= fromDate && todayStr <= toDate) {
        setLoading(true);
        try {
          const activeTasks = await checkTodayStartedOrCompletedRecurringTasks(targetUserId);
          if (activeTasks.length > 0) {
            const titles = activeTasks.map(t => `• "${t.title}" (${t.status})`).join('\n');
            const proceed = window.confirm(
              `Warning: The following recurring tasks for this user have already been started or completed today:\n\n${titles}\n\nThese tasks will NOT be deleted. Do you want to proceed with adding this leave?`
            );
            if (!proceed) {
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Error checking tasks:", err);
        }
        setLoading(false);
      }
    }

    setLoading(true);
    const { error } = await onSave({ user_id: targetUserId, leave_type: leaveType, from_date: fromDate, to_date: toDate, reason, status: 'Approved' });
    setLoading(false);
    if (error) {
      alert("Failed to add leave: " + (error.message || error.details || JSON.stringify(error)));
    } else {
      onClose();
    }
  };

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500">event_busy</span>
            <h2 className="font-bold text-lg font-headline">Add Leave</h2>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Select Staff member *</label>
            <select required className={cls} value={targetUserId} onChange={e => setTargetUserId(e.target.value)}>
              <option value="">— Select Employee —</option>
              {(profiles || []).map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.role === 'Admin' ? '(Admin)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Leave Type</label>
            <select className={cls} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
              <option value="Full Day">Full Day</option>
              <option value="Half Day AM">Half Day AM</option>
              <option value="Half Day PM">Half Day PM</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">From Date *</label>
              <input type="date" required className={cls} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">To Date *</label>
              <input type="date" required className={cls} value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reason</label>
            <input className={cls} placeholder="Optional" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl flex items-center gap-2" disabled={loading}>
              {loading ? 'Saving...' : 'Add Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeaveManagementDashboard({ leaveRequests, profiles, updateLeaveRequest, deleteLeaveRequest, applyLeave }) {
  const { checkTodayStartedOrCompletedRecurringTasks } = useDataContext();
  const [subTab, setSubTab] = useState('Pending');
  const [remarks, setRemarks] = useState({});
  const [printingLeave, setPrintingLeave] = useState(null);
  const [showAddLeave, setShowAddLeave] = useState(false);

  // Calendar states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const today = new Date().toISOString().split('T')[0];

  const pendingLeaves = (leaveRequests || []).filter(l => l.status === 'Pending');
  const approvedLeaves = (leaveRequests || []).filter(l => l.status === 'Approved' && l.to_date >= today);
  const leaveHistory = (leaveRequests || []).filter(l => l.status === 'Rejected' || (l.status === 'Approved' && l.to_date < today));

  const getProfile = (id) => profiles.find(p => p.id === id);

  const handleStatusChange = async (id, status) => {
    const remark = remarks[id] || '';
    const leave = leaveRequests.find(l => l.id === id);

    if (status === 'Approved' && leave && leave.leave_type === 'Full Day') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr >= leave.from_date && todayStr <= leave.to_date) {
        try {
          const activeTasks = await checkTodayStartedOrCompletedRecurringTasks(leave.user_id);
          if (activeTasks.length > 0) {
            const titles = activeTasks.map(t => `• "${t.title}" (${t.status})`).join('\n');
            const proceed = window.confirm(
              `Warning: The following recurring tasks for this user have already been started or completed today:\n\n${titles}\n\nThese tasks will NOT be deleted. Do you want to proceed with approving the leave?`
            );
            if (!proceed) return;
          }
        } catch (err) {
          console.error("Error checking tasks:", err);
        }
      }
    }

    const { error } = await updateLeaveRequest(id, { status, admin_remark: remark });
    if (error) {
      alert("Failed to update leave request: " + (error.message || error.details || JSON.stringify(error)));
    } else {
      setRemarks(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const triggerPrint = (leave) => {
    setPrintingLeave(leave);
    setTimeout(() => {
      window.print();
      setPrintingLeave(null);
    }, 150);
  };

  const calculateTotalDays = (fromStr, toStr) => {
    if (!fromStr || !toStr) return 0;
    const from = new Date(fromStr + 'T00:00:00');
    const to = new Date(toStr + 'T00:00:00');
    const diffTime = to - from;
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Calendar helpers
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const renderCalendarDays = () => {
    const cells = [];
    // padding cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`pad-${i}`} className="bg-slate-50 border border-slate-100 min-h-[80px]"></div>);
    }
    // actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const activeLeaves = (leaveRequests || []).filter(l => l.status === 'Approved' && dateStr >= l.from_date && dateStr <= l.to_date);

      cells.push(
        <div key={`day-${day}`} className={`bg-white border border-outline-variant/20 p-2 min-h-[90px] flex flex-col gap-1 ${dateStr === today ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-bold ${dateStr === today ? 'text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center' : 'text-on-surface-variant'}`}>{day}</span>
          </div>
          <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[70px] custom-scrollbar">
            {activeLeaves.map(l => {
              const prof = getProfile(l.user_id);
              const initials = prof ? prof.name.split(' ')[0] : 'Unknown';
              let badgeCls = 'bg-red-50 text-red-700 border-red-100';
              if (l.leave_type === 'Half Day AM') badgeCls = 'bg-blue-50 text-blue-700 border-blue-100';
              if (l.leave_type === 'Half Day PM') badgeCls = 'bg-indigo-50 text-indigo-700 border-indigo-100';
              
              return (
                <div key={l.id} className={`text-[9px] font-bold px-1 py-0.5 rounded border truncate ${badgeCls}`} title={`${prof?.name || 'Unknown'} (${l.leave_type})`}>
                  {initials} ({l.leave_type === 'Full Day' ? 'FD' : l.leave_type === 'Half Day AM' ? 'AM' : 'PM'})
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return cells;
  };

  const printingLeaveUser = printingLeave ? getProfile(printingLeave.user_id) : null;
  const approvedByProfile = printingLeave ? profiles?.find(p => p.id === printingLeave.approved_by) : null;
  const printDays = printingLeave ? calculateTotalDays(printingLeave.from_date, printingLeave.to_date) : 0;

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in flex flex-col gap-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-leave-application, #print-leave-application * {
            visibility: visible !important;
          }
          #print-leave-application {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Hidden A4 Print View */}
      {printingLeave && (
        <div id="print-leave-application" className="hidden print:block p-8 bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wide">Malabar Islamic Complex</h1>
            <p className="text-xs uppercase tracking-widest text-slate-600 mt-1">Mahinabad, Chattanchal</p>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold uppercase underline">Employee Leave Application</h2>
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-8 text-sm">
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Employee Name:</span>
              <span>{printingLeaveUser?.name || '—'}</span>
            </div>
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Department:</span>
              <span>{printingLeaveUser?.department || '—'}</span>
            </div>
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Role / Designation:</span>
              <span>{printingLeaveUser?.position || printingLeaveUser?.role || '—'}</span>
            </div>
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Applied Date:</span>
              <span>{printingLeave.created_at ? new Date(printingLeave.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-4 mb-8 bg-slate-50 text-sm">
            <h3 className="font-bold text-base border-b pb-1.5 mb-3 text-slate-800">Leave Details</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <div><strong className="text-slate-700">Leave Type:</strong> {printingLeave.leave_type}</div>
              <div><strong className="text-slate-700">Total Days:</strong> {printDays} day{printDays > 1 ? 's' : ''}</div>
              <div><strong className="text-slate-700">From Date:</strong> {printingLeave.from_date}</div>
              <div><strong className="text-slate-700">To Date:</strong> {printingLeave.to_date}</div>
            </div>
            {printingLeave.reason && (
              <div className="mt-3">
                <strong className="text-slate-700">Reason:</strong>
                <p className="mt-1 bg-white p-2 border rounded text-slate-800 italic">"{printingLeave.reason}"</p>
              </div>
            )}
          </div>
          <div className="border border-slate-300 rounded-lg p-4 mb-12 bg-slate-50 text-sm">
            <h3 className="font-bold text-base border-b pb-1.5 mb-3 text-slate-800">Approval Details</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <div><strong className="text-slate-700">Status:</strong> {printingLeave.status}</div>
              <div><strong className="text-slate-700">Approved By:</strong> {approvedByProfile?.name || 'Admin'}</div>
              {printingLeave.status === 'Approved' && (
                <div><strong className="text-slate-700">Approved Date:</strong> {printingLeave.approved_date || (printingLeave.created_at ? new Date(printingLeave.created_at).toLocaleDateString() : '—')}</div>
              )}
            </div>
            {printingLeave.admin_remark && (
              <div className="mt-3">
                <strong className="text-slate-700">Remarks:</strong>
                <p className="mt-1 bg-white p-2 border rounded text-slate-800">"{printingLeave.admin_remark}"</p>
              </div>
            )}
          </div>
          <div className="mt-20 grid grid-cols-2 gap-12 text-sm pt-8 border-t border-dashed border-slate-300">
            <div className="text-center">
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-800">Employee Signature</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: ____________________</p>
            </div>
            <div className="text-center">
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-800">Authorized Admin Signature</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: ____________________</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Leave Management</h1>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Review leave requests, calendar schedules, and directly assign leaves.</p>
        </div>
        <button 
          onClick={() => setShowAddLeave(true)}
          className="bg-primary text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Add Leave
        </button>
      </div>

      {/* Sub tabs list */}
      <div className="flex bg-surface-container rounded-xl p-1 gap-0.5 self-start">
        {['Pending', 'Approved Leaves', 'History', 'Calendar'].map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === t ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t}
            {t === 'Pending' && pendingLeaves.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black bg-red-100 text-red-700 rounded-full">{pendingLeaves.length}</span>
            )}
            {t === 'Approved Leaves' && approvedLeaves.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black bg-green-100 text-green-700 rounded-full">{approvedLeaves.length}</span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'Pending' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100">
            <h2 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span> Pending Requests
            </h2>
          </div>
          {pendingLeaves.length === 0 ? (
            <p className="p-6 text-center text-sm text-on-surface-variant font-medium">No pending requests.</p>
          ) : (
             <ul className="divide-y divide-surface-container-low">
                {pendingLeaves.map(leave => {
                  const prof = getProfile(leave.user_id);
                  return (
                    <li key={leave.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low/30">
                       <div>
                          <p className="font-bold text-sm text-on-surface">{prof?.name || 'Unknown'}</p>
                          <p className="text-[11px] font-bold text-amber-700 uppercase mt-0.5">{leave.leave_type} | {leave.from_date} to {leave.to_date}</p>
                          <p className="text-xs text-on-surface-variant mt-1">"{leave.reason || 'No reason provided'}"</p>
                       </div>
                       <div className="flex flex-col gap-2 flex-shrink-0">
                          <input 
                            type="text" 
                            placeholder="Admin Remarks (optional)" 
                            className="bg-slate-50 border border-outline-variant rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                            value={remarks[leave.id] || ''}
                            onChange={e => setRemarks({ ...remarks, [leave.id]: e.target.value })}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleStatusChange(leave.id, 'Approved')} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-colors">Approve</button>
                            <button onClick={() => handleStatusChange(leave.id, 'Rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition-colors">Reject</button>
                          </div>
                       </div>
                    </li>
                  );
                })}
             </ul>
          )}
        </div>
      )}

      {subTab === 'Approved Leaves' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-green-100">
            <h2 className="font-bold text-sm text-green-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">event_available</span> Approved Leaves (Today & Upcoming)
            </h2>
          </div>
          {approvedLeaves.length === 0 ? (
            <p className="p-6 text-center text-sm text-on-surface-variant font-medium">No approved leaves scheduled.</p>
          ) : (
             <ul className="divide-y divide-surface-container-low">
                {approvedLeaves.map(leave => {
                  const prof = getProfile(leave.user_id);
                  const isCurrent = today >= leave.from_date && today <= leave.to_date;
                  return (
                    <li key={leave.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low/30">
                       <div>
                          <div className="flex items-center gap-2.5">
                             <p className="font-bold text-sm text-on-surface">{prof?.name || 'Unknown'}</p>
                             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                               isCurrent ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                             }`}>
                               {isCurrent ? 'Active Today' : 'Upcoming'}
                             </span>
                          </div>
                          <p className="text-[11px] font-bold text-green-700 uppercase mt-0.5">{leave.leave_type} | {leave.from_date} to {leave.to_date}</p>
                          {leave.reason && <p className="text-xs text-on-surface-variant mt-1">"{leave.reason}"</p>}
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => triggerPrint(leave)} className="text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center justify-center" title="Print Leave Document">
                            <span className="material-symbols-outlined text-[18px]">print</span>
                         </button>
                         <button onClick={() => deleteLeaveRequest(leave.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="Delete Leave">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                         </button>
                       </div>
                    </li>
                  );
                })}
             </ul>
          )}
        </div>
      )}

      {subTab === 'History' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">history</span> Leave History
            </h2>
          </div>
          {leaveHistory.length === 0 ? (
            <p className="p-6 text-center text-sm text-on-surface-variant font-medium">No leave history records.</p>
          ) : (
             <ul className="divide-y divide-surface-container-low">
                {leaveHistory.map(leave => (
                   <li key={leave.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low/30">
                      <div>
                         <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-on-surface">{getProfile(leave.user_id)?.name || 'Unknown'}</p>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${leave.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{leave.status}</span>
                         </div>
                         <p className="text-[11px] font-bold text-on-surface-variant uppercase mt-0.5">{leave.leave_type} | {leave.from_date} to {leave.to_date}</p>
                         {leave.reason && <p className="text-xs text-on-surface-variant mt-1">"{leave.reason}"</p>}
                         {leave.admin_remark && <p className="text-xs text-slate-600 mt-1 font-semibold">Remarks: "{leave.admin_remark}"</p>}
                      </div>
                      <div className="flex gap-2">
                        {leave.status === 'Approved' && (
                          <button onClick={() => triggerPrint(leave)} className="text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center justify-center" title="Print Leave Document">
                             <span className="material-symbols-outlined text-[18px]">print</span>
                          </button>
                        )}
                        <button onClick={() => deleteLeaveRequest(leave.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="Delete Leave">
                           <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                   </li>
                ))}
             </ul>
          )}
        </div>
      )}

      {subTab === 'Calendar' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-headline">
              <span className="material-symbols-outlined text-primary">calendar_month</span> {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface-container rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-surface-container rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="bg-slate-50 py-2 text-center text-[10px] font-black uppercase text-on-surface-variant tracking-wider">{d}</div>
            ))}
            {renderCalendarDays()}
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant justify-center border-t border-surface-container pt-3">
             <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200 block"></span> Full Day</span>
             <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200 block"></span> Half Day AM</span>
             <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-200 block"></span> Half Day PM</span>
          </div>
        </div>
      )}

      {showAddLeave && (
        <LeaveRequestModal 
          profiles={profiles} 
          onClose={() => setShowAddLeave(false)} 
          onSave={applyLeave} 
        />
      )}
    </div>
  );
}

export default function MyLeavePage() {
  const { currentUser, leaveRequests, applyLeave, updateLeaveRequest, deleteLeaveRequest, profiles } = useDataContext();
  const [showApply, setShowApply] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  
  const [leaveType, setLeaveType] = useState('Full Day');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const [printingLeave, setPrintingLeave] = useState(null);

  const isAdmin = currentUser?.role === 'Admin';

  if (isAdmin) {
    return (
      <LeaveManagementDashboard 
        leaveRequests={leaveRequests} 
        profiles={profiles} 
        updateLeaveRequest={updateLeaveRequest} 
        deleteLeaveRequest={deleteLeaveRequest}
        applyLeave={applyLeave}
      />
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const myLeaves = (leaveRequests || [])
    .filter(l => l.user_id === currentUser?.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
  const approvedTodayAndUpcoming = myLeaves.filter(l => l.status === 'Approved' && l.to_date >= today);
  const pastLeaves = myLeaves.filter(l => l.status === 'Rejected' || (l.status === 'Approved' && l.to_date < today));

  const handleApply = async (e) => {
    e.preventDefault();
    setLoading(true);
    let result;
    if (editingLeave) {
      result = await updateLeaveRequest(editingLeave.id, {
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason
      });
    } else {
      result = await applyLeave({ leave_type: leaveType, from_date: fromDate, to_date: toDate, reason });
    }
    setLoading(false);
    if (result?.error) {
      alert("Failed to submit leave request: " + (result.error.message || result.error.details || JSON.stringify(result.error)));
    } else {
      setShowApply(false);
      setEditingLeave(null);
      setLeaveType('Full Day');
      setReason('');
    }
  };

  const handleEditClick = (leave) => {
    setEditingLeave(leave);
    setLeaveType(leave.leave_type);
    setFromDate(leave.from_date);
    setToDate(leave.to_date);
    setReason(leave.reason || '');
    setShowApply(true);
  };

  const triggerPrint = (leave) => {
    setPrintingLeave(leave);
    setTimeout(() => {
      window.print();
      setPrintingLeave(null);
    }, 150);
  };

  const calculateTotalDays = (fromStr, toStr) => {
    if (!fromStr || !toStr) return 0;
    const from = new Date(fromStr + 'T00:00:00');
    const to = new Date(toStr + 'T00:00:00');
    const diffTime = to - from;
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusColor = (status) => {
    if (status === 'Pending') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'Approved') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-surface-container text-on-surface-variant';
  };

  const approvedByProfile = printingLeave ? profiles?.find(p => p.id === printingLeave.approved_by) : null;
  const printDays = printingLeave ? calculateTotalDays(printingLeave.from_date, printingLeave.to_date) : 0;

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in flex flex-col gap-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-leave-application, #print-leave-application * {
            visibility: visible !important;
          }
          #print-leave-application {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Hidden A4 Print View */}
      {printingLeave && (
        <div id="print-leave-application" className="hidden print:block p-8 bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wide">Malabar Islamic Complex</h1>
            <p className="text-xs uppercase tracking-widest text-slate-600 mt-1">Mahinabad, Chattanchal</p>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold uppercase underline">Employee Leave Application</h2>
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-8 text-sm">
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Employee Name:</span>
              <span>{currentUser?.name || '—'}</span>
            </div>
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Department:</span>
              <span>{currentUser?.department || '—'}</span>
            </div>
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Role / Designation:</span>
              <span>{currentUser?.position || currentUser?.role || '—'}</span>
            </div>
            <div className="border-b pb-1 flex justify-between">
              <span className="font-semibold text-slate-700">Applied Date:</span>
              <span>{printingLeave.created_at ? new Date(printingLeave.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-4 mb-8 bg-slate-50 text-sm">
            <h3 className="font-bold text-base border-b pb-1.5 mb-3 text-slate-800">Leave Details</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <div><strong className="text-slate-700">Leave Type:</strong> {printingLeave.leave_type}</div>
              <div><strong className="text-slate-700">Total Days:</strong> {printDays} day{printDays > 1 ? 's' : ''}</div>
              <div><strong className="text-slate-700">From Date:</strong> {printingLeave.from_date}</div>
              <div><strong className="text-slate-700">To Date:</strong> {printingLeave.to_date}</div>
            </div>
            {printingLeave.reason && (
              <div className="mt-3">
                <strong className="text-slate-700">Reason:</strong>
                <p className="mt-1 bg-white p-2 border rounded text-slate-800 italic">"{printingLeave.reason}"</p>
              </div>
            )}
          </div>
          <div className="border border-slate-300 rounded-lg p-4 mb-12 bg-slate-50 text-sm">
            <h3 className="font-bold text-base border-b pb-1.5 mb-3 text-slate-800">Approval Details</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <div><strong className="text-slate-700">Status:</strong> {printingLeave.status}</div>
              <div><strong className="text-slate-700">Approved By:</strong> {approvedByProfile?.name || 'Admin'}</div>
              {printingLeave.status === 'Approved' && (
                <div><strong className="text-slate-700">Approved Date:</strong> {printingLeave.approved_date || (printingLeave.created_at ? new Date(printingLeave.created_at).toLocaleDateString() : '—')}</div>
              )}
            </div>
            {printingLeave.admin_remark && (
              <div className="mt-3">
                <strong className="text-slate-700">Remarks:</strong>
                <p className="mt-1 bg-white p-2 border rounded text-slate-800">"{printingLeave.admin_remark}"</p>
              </div>
            )}
          </div>
          <div className="mt-20 grid grid-cols-2 gap-12 text-sm pt-8 border-t border-dashed border-slate-300">
            <div className="text-center">
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-800">Employee Signature</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: ____________________</p>
            </div>
            <div className="text-center">
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-800">Authorized Admin Signature</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: ____________________</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">My Leave</h1>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Manage your leave requests and history.</p>
        </div>
        <button 
          onClick={() => { setEditingLeave(null); setLeaveType('Full Day'); setReason(''); setShowApply(true); }}
          className="bg-primary text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Apply Leave
        </button>
      </div>

      {showApply && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-5 md:p-6 mb-2 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">edit_calendar</span>
              {editingLeave ? 'Edit Leave Request' : 'Apply for Leave'}
            </h2>
            <button onClick={() => setShowApply(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <form onSubmit={handleApply} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Leave Type</label>
              <div className="flex gap-2 flex-wrap">
                {['Full Day', 'Half Day AM', 'Half Day PM'].map(type => (
                  <button
                    key={type} type="button"
                    onClick={() => setLeaveType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      leaveType === type ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">From Date</label>
                <input required type="date" className="bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full" value={fromDate} onChange={e => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value); }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">To Date</label>
                <input required type="date" min={fromDate} className="bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reason (Optional)</label>
              <textarea rows="2" className="bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full resize-none" placeholder="Brief reason for leave..." value={reason} onChange={e => setReason(e.target.value)}></textarea>
            </div>

            <div className="flex justify-end gap-3 border-t border-surface-container pt-4 mt-2">
              <button type="button" onClick={() => setShowApply(false)} className="px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Saving...' : (editingLeave ? 'Save Changes' : 'Submit Request')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Pending Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden flex flex-col max-h-[600px]">
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
             <span className="material-symbols-outlined text-amber-600">pending_actions</span>
             <h2 className="font-bold text-lg text-amber-900">Pending Requests</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            {pendingLeaves.length === 0 ? (
              <p className="p-8 text-center text-sm text-on-surface-variant font-medium">No pending requests.</p>
            ) : (
               <ul className="divide-y divide-surface-container-low">
                  {pendingLeaves.map(leave => (
                     <li key={leave.id} className="p-5 hover:bg-surface-container-low/30 flex justify-between items-start">
                        <div>
                           <p className="font-bold text-on-surface text-base mb-1">{leave.leave_type}</p>
                           <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">{leave.from_date} <span className="opacity-50 mx-1">TO</span> {leave.to_date}</p>
                           {leave.reason && <p className="text-sm text-on-surface-variant mb-3 border-l-2 border-amber-200 pl-2">"{leave.reason}"</p>}
                           <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Pending</span>
                        </div>
                        <div className="flex gap-1.5">
                           <button 
                             onClick={() => handleEditClick(leave)} 
                             className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors flex items-center justify-center"
                             title="Edit Request"
                           >
                             <span className="material-symbols-outlined text-[18px]">edit</span>
                           </button>
                           <button 
                             onClick={() => { if(window.confirm('Cancel this pending request?')) deleteLeaveRequest(leave.id); }} 
                             className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors flex items-center justify-center"
                             title="Cancel Request"
                           >
                             <span className="material-symbols-outlined text-[18px]">delete</span>
                           </button>
                        </div>
                     </li>
                  ))}
               </ul>
            )}
          </div>
        </div>

        {/* Right Column: Approved Leaves & History */}
        <div className="flex flex-col gap-6">
          {/* Approved Leaves (Today & Upcoming) */}
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden flex flex-col max-h-[400px]">
            <div className="px-5 py-4 bg-green-50 border-b border-green-100 flex items-center gap-3">
               <span className="material-symbols-outlined text-green-600">event_available</span>
               <h2 className="font-bold text-lg text-green-900">Approved Leaves (Today & Upcoming)</h2>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
              {approvedTodayAndUpcoming.length === 0 ? (
                <p className="p-8 text-center text-sm text-on-surface-variant font-medium">No approved leaves (today or upcoming).</p>
              ) : (
                 <ul className="divide-y divide-surface-container-low">
                    {approvedTodayAndUpcoming.map(leave => {
                      const days = calculateTotalDays(leave.from_date, leave.to_date);
                      return (
                        <li key={leave.id} className="p-5 hover:bg-surface-container-low/30 flex justify-between items-start">
                           <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                 <p className="font-bold text-on-surface text-base">{leave.leave_type}</p>
                                 <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                   {days} {days === 1 ? 'Day' : 'Days'}
                                 </span>
                              </div>
                              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{leave.from_date} <span className="opacity-50 mx-1">TO</span> {leave.to_date}</p>
                              {leave.reason && <p className="text-sm text-on-surface-variant mb-2 border-l-2 border-green-200 pl-2">"{leave.reason}"</p>}
                              {leave.admin_remark && (
                                <div className="mt-2 bg-surface-container-low p-2.5 rounded-lg text-xs">
                                  <span className="font-bold text-on-surface-variant block mb-0.5">Admin Remarks:</span>
                                  <span className="text-on-surface">{leave.admin_remark}</span>
                                </div>
                              )}
                           </div>
                           <button 
                             onClick={() => triggerPrint(leave)}
                             className="text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                             title="Download/Print Leave Application"
                           >
                             <span className="material-symbols-outlined text-[18px]">print</span>
                           </button>
                        </li>
                      );
                    })}
                 </ul>
              )}
            </div>
          </div>

          {/* Leave History */}
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden flex flex-col max-h-[400px]">
            <div className="px-5 py-4 bg-surface-container-low border-b border-surface-container-high flex items-center gap-3">
               <span className="material-symbols-outlined text-on-surface-variant">history</span>
               <h2 className="font-bold text-lg text-on-surface">Leave History</h2>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
              {pastLeaves.length === 0 ? (
                <p className="p-8 text-center text-sm text-on-surface-variant font-medium">No past leave records.</p>
              ) : (
                 <ul className="divide-y divide-surface-container-low">
                    {pastLeaves.map(leave => (
                       <li key={leave.id} className="p-5 hover:bg-surface-container-low/30 flex justify-between items-start">
                          <div className="flex-1">
                             <div className="flex justify-between items-start mb-1 mr-4">
                                <p className="font-bold text-on-surface text-base">{leave.leave_type}</p>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusColor(leave.status)}`}>{leave.status}</span>
                             </div>
                             <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{leave.from_date} <span className="opacity-50 mx-1">TO</span> {leave.to_date}</p>
                             {leave.reason && <p className="text-sm text-on-surface-variant mb-2 border-l-2 border-outline-variant/30 pl-2">"{leave.reason}"</p>}
                             {leave.admin_remark && (
                               <div className="mt-2 bg-surface-container-low p-2 rounded-lg text-xs">
                                 <span className="font-bold text-on-surface-variant block mb-0.5">Admin Remarks:</span>
                                 <span className="text-on-surface">{leave.admin_remark}</span>
                               </div>
                             )}
                          </div>
                          {leave.status === 'Approved' && (
                            <button 
                              onClick={() => triggerPrint(leave)}
                              className="text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                              title="Download/Print Leave Application"
                            >
                              <span className="material-symbols-outlined text-[18px]">print</span>
                            </button>
                          )}
                       </li>
                    ))}
                 </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
