import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';

export default function MyLeavePage() {
  const { currentUser, leaveRequests, applyLeave, deleteLeaveRequest } = useDataContext();
  const [showApply, setShowApply] = useState(false);
  const [leaveType, setLeaveType] = useState('Full Day');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const myLeaves = (leaveRequests || []).filter(l => l.user_id === currentUser?.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
  const pastLeaves = myLeaves.filter(l => l.status !== 'Pending');

  const handleApply = async (e) => {
    e.preventDefault();
    setLoading(true);
    await applyLeave({ leave_type: leaveType, from_date: fromDate, to_date: toDate, reason });
    setLoading(false);
    setShowApply(false);
    setLeaveType('Full Day');
    setReason('');
  };

  const getStatusColor = (status) => {
    if (status === 'Pending') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'Approved') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">My Leave</h1>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Manage your leave requests and history.</p>
        </div>
        <button 
          onClick={() => setShowApply(true)}
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
              <span className="material-symbols-outlined text-primary">edit_calendar</span> Apply for Leave
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
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <button 
                          onClick={() => { if(window.confirm('Cancel this pending request?')) deleteLeaveRequest(leave.id); }} 
                          className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors flex items-center justify-center"
                          title="Cancel Request"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                     </li>
                  ))}
               </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden flex flex-col max-h-[600px]">
          <div className="px-5 py-4 bg-surface-container-low border-b border-surface-container-high flex items-center gap-3">
             <span className="material-symbols-outlined text-on-surface-variant">history</span>
             <h2 className="font-bold text-lg text-on-surface">Leave History</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            {pastLeaves.length === 0 ? (
              <p className="p-8 text-center text-sm text-on-surface-variant font-medium">No past leave records.</p>
            ) : (
               <ul className="divide-y divide-surface-container-low">
                  {pastLeaves.map(leave => (
                     <li key={leave.id} className="p-5 hover:bg-surface-container-low/30">
                        <div className="flex justify-between items-start mb-1">
                           <p className="font-bold text-on-surface text-base">{leave.leave_type}</p>
                           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusColor(leave.status)}`}>{leave.status}</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{leave.from_date} <span className="opacity-50 mx-1">TO</span> {leave.to_date}</p>
                        {leave.reason && <p className="text-sm text-on-surface-variant mb-2 border-l-2 border-outline-variant/30 pl-2">"{leave.reason}"</p>}
                        {leave.admin_remarks && (
                          <div className="mt-2 bg-surface-container-low p-2 rounded-lg text-xs">
                            <span className="font-bold text-on-surface-variant block mb-0.5">Admin Remarks:</span>
                            <span className="text-on-surface">{leave.admin_remarks}</span>
                          </div>
                        )}
                     </li>
                  ))}
               </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
