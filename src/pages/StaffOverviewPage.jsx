import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, getActionableUnits, calculateUserEfficiency } from '../lib/statusUtils';
import { fmtDate, getISTDateString } from '../lib/dateUtils';
import FilterBar from '../components/common/FilterBar';

function EditUserModal({ profile, profiles, onClose, onSave }) {
  const [editData, setEditData] = useState({
    name: profile.name || '',
    username: profile.username || '',
    role: profile.role || 'Assignee',
    department: profile.department || '',
    manager: profile.manager || '',
    position: profile.position || '',
    category: profile.category || 'Office Staff',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setLoading(true); setError(null);
    const result = await onSave(profile.id, editData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else onClose();
  };

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">edit</span>
            <h2 className="font-bold text-lg font-headline">Edit — {profile.name}</h2>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-sm font-semibold">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
              <input className={cls} value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Login ID</label>
              <input type="text" className={cls} value={editData.username} onChange={e => setEditData({...editData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')})} placeholder="name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Role</label>
              <select className={cls} value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                <option value="Assignee">Assignee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            {editData.role !== 'Admin' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Staff Category</label>
                <select className={cls} value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}>
                  <option value="Office Staff">Office Staff</option>
                  <option value="Institution">Institution</option>
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
              <input className={cls} value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Position / Designation</label>
              <input className={cls} value={editData.position} onChange={e => setEditData({...editData, position: e.target.value})} placeholder="e.g. HR Officer" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Manager</label>
            <select className={cls} value={editData.manager} onChange={e => setEditData({...editData, manager: e.target.value})}>
              <option value="">— None —</option>
              {profiles.filter(p => p.id !== profile.id).map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-container">
          <button className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl flex items-center gap-2" onClick={handleSave} disabled={loading}>
            <span className="material-symbols-outlined text-[16px]">save</span>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ profile, onClose, onReset }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) { setError('Min. 6 characters.'); return; }
    setLoading(true); setError(null);
    const result = await onReset(profile.id, pw);
    setLoading(false);
    console.log('Password reset result:', result);
    if (result?.error) {
      setError(typeof result.error === 'string' ? result.error : result.error?.message || 'Reset failed. Database update error.');
    } else {
      setDone(true);
    }
  };

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">lock_reset</span>
            <div>
              <p className="font-bold font-headline">Reset Password</p>
              <p className="text-xs text-on-surface-variant">{profile.name}</p>
            </div>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {done ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-green-500 text-5xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
            <p className="font-bold text-on-surface">Password reset!</p>
            <button className="mt-2 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {error && <p className="text-error text-sm font-bold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <p className="text-sm text-on-surface-variant">Set a new password for <strong>{profile.name}</strong>.</p>
            <input type="password" className={cls} placeholder="New password (min 6 chars)" value={pw} onChange={e => setPw(e.target.value)} required />
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold bg-error text-white rounded-xl flex items-center gap-2" disabled={loading}>
                <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                {loading ? 'Resetting...' : 'Force Reset'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const generateLoginId = (name) => name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
const generatePassword = () => {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({length: 10}, () => c[Math.floor(Math.random() * c.length)]).join('');
};

function CredentialsModal({ name, loginId, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `MIC WorkPulse Credentials\n\nName: ${name}\nLogin ID: ${loginId}\nPassword: ${password}`;
  React.useEffect(() => { navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {}); }, [text]);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1002] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 py-5 bg-green-50 border-b border-green-100 rounded-t-2xl">
          <span className="material-symbols-outlined text-green-600 text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          <div>
            <p className="font-bold text-lg font-headline">User Created!</p>
            <p className="text-xs text-green-700 font-medium">{copied ? 'Credentials auto-copied ✓' : 'Copy credentials below'}</p>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="bg-slate-50 border border-outline-variant/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between"><span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Name</span><span className="font-semibold text-sm">{name}</span></div>
            <div className="h-px bg-outline-variant/30"></div>
            <div className="flex justify-between"><span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Login ID</span><span className="font-mono font-bold text-primary text-sm">{loginId}</span></div>
            <div className="h-px bg-outline-variant/30"></div>
            <div className="flex justify-between"><span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Password</span><span className="font-mono font-bold text-error tracking-widest">{password}</span></div>
          </div>
          <div className="flex gap-3">
            <button className={`flex-1 py-2.5 text-sm font-bold border rounded-xl flex items-center justify-center gap-2 transition-all ${copied ? 'border-green-400 bg-green-50 text-green-700' : 'border-outline-variant hover:bg-surface-container'}`}
              onClick={() => { navigator.clipboard.writeText(text); setCopied(true); }}>
              <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveManagementTab({ leaveRequests, profiles, updateLeaveRequest, deleteLeaveRequest }) {
  const [subTab, setSubTab] = useState('Pending');
  const [remarks, setRemarks] = useState({});
  const [printingLeave, setPrintingLeave] = useState(null);

  // Calendar states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const today = getISTDateString();

  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending');
  const approvedToday = leaveRequests.filter(l => l.status === 'Approved' && today >= l.from_date && today <= l.to_date);
  const upcomingLeaves = leaveRequests.filter(l => l.status === 'Approved' && l.from_date > today);
  const leaveHistory = leaveRequests.filter(l => l.status === 'Rejected' || (l.status === 'Approved' && l.to_date < today));

  const getProfile = (id) => profiles.find(p => p.id === id);

  const handleStatusChange = async (id, status) => {
    const remark = remarks[id] || '';
    await updateLeaveRequest(id, { status, admin_remark: remark });
    setRemarks(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      const activeLeaves = leaveRequests.filter(l => l.status === 'Approved' && dateStr >= l.from_date && dateStr <= l.to_date);

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
    <div className="flex flex-col gap-6">
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

      {/* Sub tabs list */}
      <div className="flex bg-surface-container rounded-xl p-1 gap-0.5 self-start">
        {['Pending', 'Approved Today', 'Upcoming', 'History', 'Calendar'].map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === t ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'Pending' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
            <h2 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span> Pending Requests
            </h2>
          </div>
          {pendingLeaves.length === 0 ? (
            <p className="p-6 text-center text-sm text-on-surface-variant font-medium">No pending requests.</p>
          ) : (
             <ul className="divide-y divide-surface-container-low">
                {pendingLeaves.map(leave => (
                   <li key={leave.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low/30">
                      <div>
                         <p className="font-bold text-sm text-on-surface">{getProfile(leave.user_id)?.name || 'Unknown'}</p>
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
                           <button onClick={() => handleStatusChange(leave.id, 'Approved')} className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-xl hover:bg-green-200 transition-colors">Approve</button>
                           <button onClick={() => handleStatusChange(leave.id, 'Rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition-colors">Reject</button>
                         </div>
                      </div>
                   </li>
                ))}
             </ul>
          )}
        </div>
      )}

      {subTab === 'Approved Today' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-green-100">
            <h2 className="font-bold text-sm text-green-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">event_available</span> Active Approved Leaves Today
            </h2>
          </div>
          {approvedToday.length === 0 ? (
            <p className="p-6 text-center text-sm text-on-surface-variant font-medium">No active leaves today.</p>
          ) : (
             <ul className="divide-y divide-surface-container-low">
                {approvedToday.map(leave => (
                   <li key={leave.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low/30">
                      <div>
                         <p className="font-bold text-sm text-on-surface">{getProfile(leave.user_id)?.name || 'Unknown'}</p>
                         <p className="text-[11px] font-bold text-green-700 uppercase mt-0.5">{leave.leave_type} | {leave.from_date} to {leave.to_date}</p>
                         <p className="text-xs text-on-surface-variant mt-1">"{leave.reason || 'No reason provided'}"</p>
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
                ))}
             </ul>
          )}
        </div>
      )}

      {subTab === 'Upcoming' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <h2 className="font-bold text-sm text-blue-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span> Upcoming Leaves
            </h2>
          </div>
          {upcomingLeaves.length === 0 ? (
            <p className="p-6 text-center text-sm text-on-surface-variant font-medium">No upcoming leaves scheduled.</p>
          ) : (
             <ul className="divide-y divide-surface-container-low">
                {upcomingLeaves.map(leave => (
                   <li key={leave.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low/30">
                      <div>
                         <p className="font-bold text-sm text-on-surface">{getProfile(leave.user_id)?.name || 'Unknown'}</p>
                         <p className="text-[11px] font-bold text-blue-700 uppercase mt-0.5">{leave.leave_type} | {leave.from_date} to {leave.to_date}</p>
                         <p className="text-xs text-on-surface-variant mt-1">"{leave.reason || 'No reason provided'}"</p>
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
                ))}
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
                         <p className="text-xs text-on-surface-variant mt-1">"{leave.reason || 'No reason provided'}"</p>
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
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-inner min-w-[600px] md:min-w-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="bg-slate-50 py-2 text-center text-[10px] font-black uppercase text-on-surface-variant tracking-wider">{d}</div>
              ))}
              {renderCalendarDays()}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant justify-center border-t border-surface-container pt-3">
             <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200 block"></span> Full Day</span>
             <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200 block"></span> Half Day AM</span>
             <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-200 block"></span> Half Day PM</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaveRequestModal({ profile, onClose, onSave }) {
  const [leaveType, setLeaveType] = useState('Full Day');
  const [fromDate, setFromDate] = useState(getISTDateString());
  const [toDate, setToDate] = useState(getISTDateString());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ user_id: profile.id, leave_type: leaveType, from_date: fromDate, to_date: toDate, reason, status: 'Approved' });
    setLoading(false);
    onClose();
  };

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";

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
          <p className="text-sm text-on-surface-variant">Adding approved leave for <span className="font-bold text-on-surface">{profile.name}</span>.</p>
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

function TaskDetailModal({ task, workItems, containers, profiles, onClose }) {
  let container = task.container_id ? containers.find(c => c.id === task.container_id) : null;
  if (!container && task.parent_id) {
    const parent = workItems.find(w => w.id === task.parent_id);
    if (parent && parent.container_id) {
      container = containers.find(c => c.id === parent.container_id);
    }
  }
  const assignee = task.assignee_id ? profiles.find(p => p.id === task.assignee_id) : null;
  const status = getDisplayStatus(task);
  const followUps = workItems.filter(w => w.linked_to === task.id);

  const displayType = task.type === 'Milestone' ? 'Project' : (task.type === 'Checklist' || task.type === 'Phase' ? 'Event' : task.type);
  const typeColors = {
    Task: 'bg-blue-100 text-blue-700',
    Project: 'bg-purple-100 text-purple-700',
    Event: 'bg-emerald-100 text-emerald-700',
    Subtask: 'bg-orange-100 text-orange-700',
  };
  const statusColors = {
    Overdue: 'bg-red-100 text-red-700',
    Ongoing: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    'Not Started': 'bg-amber-100 text-amber-700',
    Assigned: 'bg-surface-container text-on-surface-variant',
  };

  const renderRow = (label, value) => value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-container last:border-0">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-on-surface font-medium flex-1">{value}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {task.type !== 'Task' && (
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${typeColors[displayType] || 'bg-surface-container text-on-surface-variant'}`}>{displayType}</span>
              )}
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusColors[status] || ''}`}>{status}</span>
            </div>
            <h2 className="font-bold text-base text-on-surface leading-snug">{task.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0"><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="px-6 py-2 overflow-y-auto max-h-[70vh]">
          {renderRow("Due Date", task.expected_date ? fmtDate(task.expected_date) : 'No date set')}
          {renderRow("Assignee", assignee?.name || (task.assignee_id ? 'Unknown' : 'Unassigned'))}
          {container && renderRow(container.type, container.title)}
          {!container && !task.container_id && renderRow("Context", "Standalone Task")}
          {task.description && renderRow("Description", task.description)}
          {task.status === 'Completed' && task.completion_note && (
            <div className="py-2.5 border-b border-surface-container">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Completion Note</span>
              <p className="text-sm text-on-surface font-medium bg-green-50 border border-green-100 rounded-xl px-3 py-2">{task.completion_note}</p>
            </div>
          )}
          {task.status === 'Completed' && task.completion_tag && (
            renderRow("Tag", task.completion_tag)
          )}
          {followUps.length > 0 && (
            <div className="py-2.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Follow-up Tasks</span>
              <div className="flex flex-col gap-1.5">
                {followUps.map(f => {
                  const fds = getDisplayStatus(f);
                  const fCls = fds === 'Completed' ? 'bg-green-100 text-green-700' : fds === 'Overdue' ? 'bg-red-100 text-red-700' : fds === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant';
                  return (
                    <div key={f.id} className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2">
                      <span className="text-sm font-medium text-on-surface flex-1 leading-tight">{f.title}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${fCls}`}>{fds}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-surface-container">
          <button className="w-full py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function StaffOverviewPage() {
  const {
    profiles, workItems, containers, staffGroup, currentUser,
    leaveRequests, applyLeave,
    createUser, adminUpdateProfile, adminResetUserPassword, adminUpdateUser,
  } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  const [pageTab, setPageTab] = useState('Overview');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedFilter, setExpandedFilter] = useState(null);
  const [deptFilter, setDeptFilter] = useState('All');
  const [efficiencyDetailId, setEfficiencyDetailId] = useState(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [collapsedCompleted, setCollapsedCompleted] = useState({});

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Assignee');
  const [newDept, setNewDept] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newCategory, setNewCategory] = useState('Office Staff');
  const [newManager, setNewManager] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [resettingProfile, setResettingProfile] = useState(null);

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const staffList = safeProfiles.filter(s => {
    if (staffGroup === 'Self') return s.id === currentUser?.id;
    if (staffGroup === 'Admin') return s.role === 'Admin';
    return s.role !== 'Admin' && (s.category || 'Office Staff') === staffGroup;
  });

  const departments = ['All', ...new Set(staffList.map(p => p.department).filter(Boolean))];
  const filteredStaff = staffList.filter(s => deptFilter === 'All' || s.department === deptFilter);

  const [absentProfile, setAbsentProfile] = useState(null);

  const getMetrics = (staffId) => {
    const allTasks = safeWorkItems.filter(t => t.assignee_id === staffId);
    const tasks = getActionableUnits(allTasks); // live view — no date filter

    let assigned = 0, notStarted = 0, ongoing = 0, completed = 0, overdue = 0;

    tasks.forEach(t => {
      const ds = getDisplayStatus(t);
      if (ds === 'Completed') completed++;
      else if (ds === 'Overdue') overdue++;
      else if (ds === 'Ongoing') ongoing++;
      else if (ds === 'Not Started') notStarted++;
      else assigned++; // 'Assigned' — not yet at trigger date
    });

    const efficiency = calculateUserEfficiency(tasks, leaveRequests);
    
    // Total due work counts for efficiency display
    const totalDueWork = tasks.filter(t => {
      const ds = getDisplayStatus(t);
      return ds === 'Completed' || ds === 'Overdue' || ds === 'Not Started';
    }).length;

    return {
      overdue,
      notStarted,
      assigned,
      ongoing,
      completed,
      total: totalDueWork,
      active: assigned + ongoing + notStarted,
      efficiency,
      tasks
    };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setCreateError('Name is required.'); return; }
    if (!newLoginId.trim()) { setCreateError('Login ID is required.'); return; }
    if (!newPassword.trim()) { setCreateError('Password is required.'); return; }
    setCreateLoading(true); setCreateError(null);
    const { data, error } = await createUser({ username: newLoginId, password: newPassword, full_name: newName, role: newRole, department: newDept, manager: newManager, position: newPosition, category: newCategory });
    setCreateLoading(false);
    if (error) { setCreateError(typeof error === 'string' ? error : error?.message || 'Failed to create user.'); return; }
    const savedLoginId = data?.loginId || newLoginId;
    setIsCreateOpen(false);
    setNewName(''); setNewLoginId(''); setNewPassword(''); setNewDept(''); setNewManager(''); setNewPosition(''); setNewCategory('Office Staff');
    setCreatedCreds({ name: newName, loginId: savedLoginId, password: newPassword });
  };

  const handleSaveEdit = async (id, editData) => {
    console.log('Saving profile:', id, editData);
    const { error } = await adminUpdateProfile(id, {
      name: editData.name,
      username: editData.username || null,
      role: editData.role,
      department: editData.department || null,
      manager: editData.manager || null,
      position: editData.position || null,
      category: editData.category || 'Office Staff',
    });
    console.log('Save result:', error);
    return { error: error?.message || error || null };
  };

  const handleToggleActive = async (profile) => {
    if (profile.id === currentUser?.id) {
      alert("You cannot deactivate your own account.");
      return;
    }
    const isActivating = profile.is_active === false;
    const confirmMsg = isActivating 
      ? `Are you sure you want to activate ${profile.name}?`
      : `Are you sure you want to deactivate ${profile.name}? Deactivated users will not be able to log in.`;
    if (!window.confirm(confirmMsg)) return;

    const { error } = await adminUpdateUser(profile.id, { is_active: isActivating });
    if (error) {
      alert("Failed to update status: " + (error.message || JSON.stringify(error)));
    }
  };

  const inputCls = "bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full";

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto pb-20">

      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
           <div>
             <h1 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">
               Staffs
             </h1>
           </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPageTab('Overview')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border transition-all ${pageTab === 'Overview' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              Overview
            </button>
            <button
              onClick={() => setPageTab('Manage')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border transition-all ${pageTab === 'Manage' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              Manage Staff
            </button>


            {pageTab === 'Manage' && (
              <button onClick={() => {
                setNewRole(staffGroup === 'Admin' ? 'Admin' : 'Assignee');
                setNewCategory(staffGroup === 'Admin' ? '' : (staffGroup === 'Self' ? 'Office Staff' : staffGroup));
                setIsCreateOpen(true);
              }} className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-1.5 hover:opacity-90">
                <span className="material-symbols-outlined text-[16px]">person_add</span>Add User
              </button>
            )}

            {pageTab === 'Overview' && (
              <select className="bg-white border border-outline-variant/40 rounded-xl px-3 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
              </select>
            )}
          </div>
        </div>

        <FilterBar showToggle={true} showDateFilter={false} />
      </div>

      {pageTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStaff.map(staff => {
            const m = getMetrics(staff.id);
            const isExpanded = expandedId === staff.id;
            const isOverloaded = m.overdue > 0;

            // Group tasks by display status for expanded view
            const activeTasks = m.tasks.filter(t => getDisplayStatus(t) !== 'Completed');
            const overdueTasks = activeTasks.filter(t => getDisplayStatus(t) === 'Overdue');
            const ongoingTasks = activeTasks.filter(t => getDisplayStatus(t) === 'Ongoing');
            const notStartedTasks = activeTasks.filter(t => getDisplayStatus(t) === 'Not Started');
            const assignedTasks = activeTasks.filter(t => getDisplayStatus(t) === 'Assigned');

            const completedTasks = m.tasks.filter(t => t.status === 'Completed');
            const todayStr = getISTDateString();
            const yesterdayObj = new Date();
            yesterdayObj.setDate(yesterdayObj.getDate() - 1);
            const yesterdayStr = getISTDateString(yesterdayObj);

            const todayCompleted = completedTasks.filter(t => t.completed_at && getISTDateString(t.completed_at) === todayStr);
            const yesterdayCompleted = completedTasks.filter(t => t.completed_at && getISTDateString(t.completed_at) === yesterdayStr);
            const oldCompleted = completedTasks.filter(t => !t.completed_at || (getISTDateString(t.completed_at) !== todayStr && getISTDateString(t.completed_at) !== yesterdayStr));

            // Recent activity: last 3 completed/started tasks
            const recentAct = [...m.tasks]
              .filter(t => t.status === 'Completed' || t.status === 'Ongoing')
              .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
              .slice(0, 3);

            const typeChip = (type) => {
              const map = {
                Task: 'bg-blue-100 text-blue-700',
                Milestone: 'bg-purple-100 text-purple-700',
                Checklist: 'bg-green-100 text-green-700',
                Event: 'bg-emerald-100 text-emerald-700',
                Project: 'bg-indigo-100 text-indigo-700',
              };
              return map[type] || 'bg-surface-container text-on-surface-variant';
            };

            const statusChip = (s) => {
              if (s === 'Overdue') return 'bg-red-100 text-red-700';
              if (s === 'Ongoing') return 'bg-blue-100 text-blue-700';
              if (s === 'Completed') return 'bg-green-100 text-green-700';
              if (s === 'Not Started') return 'bg-amber-100 text-amber-700';
              return 'bg-surface-container text-on-surface-variant';
            };

            const taskRow = (t) => {
              const s = getDisplayStatus(t);
              const displayType = t.type === 'Milestone' ? 'Project' : (t.type === 'Checklist' || t.type === 'Phase' ? 'Event' : t.type);
              const typeColorsMap = {
                Project: 'bg-purple-100 text-purple-700',
                Event: 'bg-emerald-100 text-emerald-700',
              };
              const typeColorCls = typeColorsMap[displayType] || typeChip(t.type);

              return (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-outline-variant/20 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all" onClick={() => setSelectedTaskDetail(t)}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s === 'Overdue' ? 'bg-error' : s === 'Ongoing' ? 'bg-blue-500' : s === 'Completed' ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">{t.title}</p>
                    <p className="text-[10px] text-on-surface-variant">{t.expected_date ? `Due ${fmtDate(t.expected_date)}` : 'No date'}</p>
                  </div>
                  {t.type !== 'Task' && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${typeColorCls}`}>{displayType}</span>
                  )}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-[8px] font-bold uppercase text-on-surface-variant tracking-wider">STATUS</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${statusChip(s)}`}>{s}</span>
                  </div>
                </div>
              );
            };

            return (
              <div
                key={staff.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${isExpanded ? 'border-primary/40 shadow-md md:col-span-2' : 'border-outline-variant/30 hover:shadow-md cursor-pointer'}`}
                onClick={() => { if (isExpanded) { setExpandedId(null); setExpandedFilter(null); } else { setExpandedId(staff.id); setExpandedFilter(null); } }}
              >
                {/* ── Card Header ── */}
                <div className="px-5 pt-5 pb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {staff.avatar_url
                      ? <img src={staff.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-outline-variant/20 flex-shrink-0" />
                      : <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm border-2 border-primary/20 flex-shrink-0">{getAvatarInitials(staff.name)}</div>
                    }
                    <div>
                      <p className="font-bold text-on-surface leading-tight">{staff.name}</p>
                      {staff.position
                        ? <p className="text-xs text-primary font-semibold leading-tight">{staff.position}</p>
                        : <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">{staff.role?.replace('_', ' ') || 'Assignee'}</p>
                      }
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-on-surface-variant font-bold border-t border-outline-variant/10 pt-1">
                        {staff.department && <span className="uppercase">{staff.department}</span>}
                        {staff.department && staff.category && <span className="opacity-40">•</span>}
                        {staff.role !== 'Admin' && staff.category && <span className={staff.category === 'Office Staff' ? 'text-blue-600' : 'text-emerald-600'}>{staff.category}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${isOverloaded ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    ● {isOverloaded ? 'AT RISK' : 'ACTIVE'}
                  </span>
                </div>
                <div className="px-5 pb-3 flex items-center gap-2">
                   <button onClick={(e) => { e.stopPropagation(); setAbsentProfile(staff); }} className="text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded transition-colors flex items-center gap-1">
                     <span className="material-symbols-outlined text-[13px]">event_busy</span> Add Leave
                   </button>
                </div>

                {/* ── Overdue + Not Started ── */}
                <div className="px-5 pb-3 grid grid-cols-2 gap-3">
                  <div onClick={(e) => { e.stopPropagation(); setExpandedId(staff.id); setExpandedFilter(expandedFilter === 'Overdue' && expandedId === staff.id ? null : 'Overdue'); }} className={`rounded-xl p-3 cursor-pointer transition-all ${isExpanded && expandedFilter === 'Overdue' ? 'ring-2 ring-error' : ''} ${m.overdue > 0 ? 'bg-red-50 border border-red-100 hover:bg-red-100' : 'bg-surface-container-low hover:bg-surface-container'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${m.overdue > 0 ? 'text-error' : 'text-on-surface-variant'}`}>Overdue</p>
                    <p className={`text-2xl font-black ${m.overdue > 0 ? 'text-error' : 'text-on-surface-variant'}`}>{m.overdue}</p>
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); setExpandedId(staff.id); setExpandedFilter(expandedFilter === 'Not Started' && expandedId === staff.id ? null : 'Not Started'); }} className={`rounded-xl p-3 cursor-pointer transition-all ${isExpanded && expandedFilter === 'Not Started' ? 'ring-2 ring-amber-400' : ''} ${m.notStarted > 0 ? 'bg-amber-50 border border-amber-100 hover:bg-amber-100' : 'bg-surface-container-low hover:bg-surface-container'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${m.notStarted > 0 ? 'text-amber-700' : 'text-on-surface-variant'}`}>Not Started</p>
                    <p className={`text-2xl font-black ${m.notStarted > 0 ? 'text-amber-600' : 'text-on-surface'}`}>{m.notStarted}</p>
                  </div>
                </div>

                {/* ── Assigned / Ongoing / Completed ── */}
                <div className="px-5 pb-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Assigned',  val: m.assigned,  cls: 'text-on-surface' },
                    { label: 'Ongoing',   val: m.ongoing,   cls: 'text-blue-600'   },
                    { label: 'Completed', val: m.completed, cls: 'text-green-600'  },
                  ].map(({ label, val, cls }) => (
                    <div key={label}
                      onClick={(e) => { e.stopPropagation(); setExpandedId(staff.id); setExpandedFilter(expandedFilter === label && expandedId === staff.id ? null : label); }}
                      className={`bg-surface-container-low rounded-xl py-2.5 cursor-pointer hover:bg-surface-container transition-all ${isExpanded && expandedFilter === label ? 'ring-2 ring-primary/40' : ''}`}>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{label}</p>
                      <p className={`text-lg font-black ${cls}`}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* ── Work Efficiency ── */}
                <div className="px-5 pb-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); setEfficiencyDetailId(efficiencyDetailId === staff.id ? null : staff.id); }}>
                  <div className="flex justify-between text-[9px] font-bold text-on-surface-variant mb-1">
                    <span className="flex items-center gap-1">WORK EFFICIENCY <span className="material-symbols-outlined text-[11px] opacity-50">info</span></span>
                    <span className="text-primary font-black">{m.efficiency}%</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.efficiency < 40 ? 'bg-error' : m.efficiency < 70 ? 'bg-amber-400' : 'bg-primary'}`} style={{width:`${m.efficiency}%`}}></div>
                  </div>
                  {efficiencyDetailId === staff.id && (
                    <div className="mt-2 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-xs text-on-surface-variant flex flex-col gap-1">
                      <p className="font-bold text-on-surface mb-1">Efficiency Calculation</p>
                      <p className="font-semibold text-primary">{m.efficiency}% Efficiency</p>
                      <p className="text-[10px] opacity-80">Formula: <span className="font-mono bg-surface-container px-1 py-0.5 rounded">(OnTime * 1.0 + Late * 0.5) / Total Due Work * 100</span></p>
                      <p className="text-[10px] opacity-80 mt-1">Total Due Work ({m.total}) = Completed ({m.completed}) + Overdue ({m.overdue}) + Not Started ({m.notStarted}).</p>
                      <p className="text-[10px] opacity-80">Ongoing ({m.ongoing}) and Future/Assigned ({m.assigned}) tasks are excluded.</p>
                    </div>
                  )}
                </div>

                {/* ── Expanded Detail ── */}
                {isExpanded && (
                  <div className="border-t border-surface-container-high mx-0 px-5 pt-5 pb-5 bg-surface-container-low/30 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

                    {/* Work Items Summary */}
                    <div>
                      <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">list_alt</span>
                        {expandedFilter ? `${expandedFilter} Tasks` : 'Work Items Summary'}
                        {expandedFilter && (
                          <button onClick={() => setExpandedFilter(null)} className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors ml-1">
                            Show All
                          </button>
                        )}
                      </p>
                      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                        {(!expandedFilter || expandedFilter === 'Overdue') && overdueTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-error mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-error rounded-full inline-block"></span>
                              Overdue ({overdueTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{overdueTasks.map(taskRow)}</div>
                          </div>
                        )}
                        {(!expandedFilter || expandedFilter === 'Ongoing') && ongoingTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                              Ongoing ({ongoingTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{ongoingTasks.map(taskRow)}</div>
                          </div>
                        )}
                        {(!expandedFilter || expandedFilter === 'Not Started') && notStartedTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-amber-400 rounded-full inline-block"></span>
                              Not Started ({notStartedTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{notStartedTasks.map(taskRow)}</div>
                          </div>
                        )}
                        {(!expandedFilter || expandedFilter === 'Assigned') && assignedTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-outline rounded-full inline-block"></span>
                              Assigned ({assignedTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{assignedTasks.map(taskRow)}</div>
                          </div>
                        )}
                        {expandedFilter === 'Completed' && (
                          <div className="flex flex-col gap-3">
                            <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                              Completed Tasks ({completedTasks.length})
                            </p>
                            
                            {/* Group 1: Today */}
                            {(() => {
                              if (todayCompleted.length === 0) return null;
                              const isCollapsed = collapsedCompleted[`${staff.id}_today`] === true;
                              return (
                                <div className="border border-outline-variant/30 rounded-xl bg-white overflow-hidden shadow-sm">
                                  <div 
                                    onClick={() => setCollapsedCompleted(prev => ({ ...prev, [`${staff.id}_today`]: !isCollapsed }))}
                                    className="bg-green-50/20 px-4 py-2.5 flex items-center justify-between cursor-pointer select-none border-b border-slate-100 hover:bg-green-50/40 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-150" style={{ transform: isCollapsed ? 'none' : 'rotate(90deg)' }}>
                                        chevron_right
                                      </span>
                                      <span className="material-symbols-outlined text-[16px] text-green-600">today</span>
                                      <span className="text-xs font-bold text-slate-700">Today</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                                      {todayCompleted.length}
                                    </span>
                                  </div>
                                  {!isCollapsed && (
                                    <div className="p-3 bg-slate-50/30 flex flex-col gap-2">
                                      {todayCompleted.map(taskRow)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Group 2: Yesterday */}
                            {(() => {
                              if (yesterdayCompleted.length === 0) return null;
                              const isCollapsed = collapsedCompleted[`${staff.id}_yesterday`] === true;
                              return (
                                <div className="border border-outline-variant/30 rounded-xl bg-white overflow-hidden shadow-sm">
                                  <div 
                                    onClick={() => setCollapsedCompleted(prev => ({ ...prev, [`${staff.id}_yesterday`]: !isCollapsed }))}
                                    className="bg-blue-50/20 px-4 py-2.5 flex items-center justify-between cursor-pointer select-none border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-150" style={{ transform: isCollapsed ? 'none' : 'rotate(90deg)' }}>
                                        chevron_right
                                      </span>
                                      <span className="material-symbols-outlined text-[16px] text-blue-600">event</span>
                                      <span className="text-xs font-bold text-slate-700">Yesterday</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                      {yesterdayCompleted.length}
                                    </span>
                                  </div>
                                  {!isCollapsed && (
                                    <div className="p-3 bg-slate-50/30 flex flex-col gap-2">
                                      {yesterdayCompleted.map(taskRow)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Group 3: Old */}
                            {(() => {
                              if (oldCompleted.length === 0) return null;
                              const isCollapsed = collapsedCompleted[`${staff.id}_old`] === true;
                              return (
                                <div className="border border-outline-variant/30 rounded-xl bg-white overflow-hidden shadow-sm">
                                  <div 
                                    onClick={() => setCollapsedCompleted(prev => ({ ...prev, [`${staff.id}_old`]: !isCollapsed }))}
                                    className="bg-slate-50 px-4 py-2.5 flex items-center justify-between cursor-pointer select-none border-b border-slate-100 hover:bg-slate-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-150" style={{ transform: isCollapsed ? 'none' : 'rotate(90deg)' }}>
                                        chevron_right
                                      </span>
                                      <span className="material-symbols-outlined text-[16px] text-slate-500">calendar_month</span>
                                      <span className="text-xs font-bold text-slate-700">Older</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                                      {oldCompleted.length}
                                    </span>
                                  </div>
                                  {!isCollapsed && (
                                    <div className="p-3 bg-slate-50/30 flex flex-col gap-2">
                                      {oldCompleted.map(taskRow)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {completedTasks.length === 0 && (
                              <p className="text-xs text-on-surface-variant italic text-center py-4">No completed tasks.</p>
                            )}
                          </div>
                        )}
                        {!expandedFilter && activeTasks.length === 0 && (
                          <p className="text-xs text-on-surface-variant italic text-center py-4">No active tasks in this period.</p>
                        )}
                        {expandedFilter && expandedFilter !== 'Completed' && activeTasks.filter(t => getDisplayStatus(t) === expandedFilter).length === 0 && (
                          <p className="text-xs text-on-surface-variant italic text-center py-4">No {expandedFilter.toLowerCase()} tasks.</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    {recentAct.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">history</span>
                          Recent Activity
                        </p>
                        <div className="flex flex-col gap-2">
                          {recentAct.map(t => (
                            <div key={t.id} className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${t.status === 'Completed' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                <span className={`material-symbols-outlined text-[11px] ${t.status === 'Completed' ? 'text-green-600' : 'text-blue-600'}`} style={{fontVariationSettings:"'FILL' 1"}}>{t.status === 'Completed' ? 'check_circle' : 'play_circle'}</span>
                              </span>
                              <p className="text-xs text-on-surface-variant flex-1 truncate">
                                <span className={`font-bold ${t.status === 'Completed' ? 'text-green-600' : 'text-blue-600'}`}>{t.status === 'Completed' ? 'Completed' : 'Started'}</span>{' '}{t.title}
                              </p>
                              <span className="text-[9px] text-on-surface-variant flex-shrink-0">
                                {t.updated_at ? new Date(t.updated_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredStaff.length === 0 && (
            <div className="col-span-2 text-center py-20 text-on-surface-variant bg-white rounded-2xl border border-outline-variant/30">
              <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
              <p className="font-bold">No staff{deptFilter !== 'All' ? ` (${deptFilter})` : ''}.</p>
            </div>
          )}
        </div>
      )}

      {pageTab === 'Manage' && (
        <div className="flex flex-col gap-4">
          {isCreateOpen && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-green-600">person_add</span>
                <div>
                  <h3 className="font-bold font-headline text-on-surface">New Staff Member</h3>
                  <p className="text-xs text-on-surface-variant">Login email & password auto-generated from name.</p>
                </div>
              </div>
              {createError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-bold mb-4 border border-red-100">{createError}</div>}
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Full Name *</label>
                    <input required className={inputCls} placeholder="name" value={newName} onChange={e => { setNewName(e.target.value); if (!newLoginId) setNewLoginId(generateLoginId(e.target.value)); }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Login ID *</label>
                    <input required className={inputCls} placeholder="name" value={newLoginId} onChange={e => setNewLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} />
                    <p className="text-[10px] text-on-surface-variant">Used to sign in. Letters, numbers, dots only.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">Password *</label>
                  <div className="flex gap-2">
                    <input required className={inputCls} placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button type="button" className="px-3 py-2 text-xs font-bold border border-outline-variant rounded-lg hover:bg-surface-container whitespace-nowrap" onClick={() => setNewPassword(generatePassword())}>Generate</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Position / Designation</label>
                    <input className={inputCls} placeholder="e.g. HR Officer" value={newPosition} onChange={e => setNewPosition(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Manager</label>
                    <select className={inputCls} value={newManager} onChange={e => setNewManager(e.target.value)}>
                      <option value="">— None —</option>
                      {safeProfiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-on-surface-variant">Role</label>
                      <select className={inputCls} value={newRole} onChange={e => setNewRole(e.target.value)}>
                        <option value="Assignee">Assignee</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    {newRole !== 'Admin' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-on-surface-variant">Staff Category</label>
                        <select className={inputCls} value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                          <option value="Office Staff">Office Staff</option>
                          <option value="Institution">Institution</option>
                        </select>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-on-surface-variant">Department</label>
                      <input className={inputCls} placeholder="Optional" value={newDept} onChange={e => setNewDept(e.target.value)} />
                    </div>
                  </div>
                <div className="flex justify-end gap-3 border-t border-surface-container pt-4">
                  <button type="button" className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                  <button type="submit" disabled={createLoading} className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    {createLoading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                  <tr>
                    <th className="px-5 py-4">Name & Position</th>
                    <th className="px-5 py-4">Login ID</th>
                    <th className="px-5 py-4 text-center">Role</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Manager</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {staffList.map(p => (
                    <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30 flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{getAvatarInitials(p.name)}</div>
                          }
                          <div>
                            <p className="font-semibold text-on-surface leading-tight">{p.name}</p>
                            {p.position && <p className="text-[10px] text-primary font-bold">{p.position}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{p.username || p.email || <span className="italic text-outline text-xs">not set</span>}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${p.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {p.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">{p.department || '—'}</td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">{p.manager || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button className="text-xs font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all" onClick={() => setEditingProfile(p)}>Edit</button>
                          <button className="text-xs font-bold text-error border border-error/30 bg-error/5 hover:bg-error hover:text-white px-3 py-1.5 rounded-lg transition-all" onClick={() => setResettingProfile(p)}>Reset PW</button>
                          {p.id !== currentUser?.id && (
                            <button
                              className={`text-xs font-bold border px-3 py-1.5 rounded-lg transition-all ${
                                p.is_active !== false
                                  ? 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-600 hover:text-white hover:border-amber-600'
                                  : 'text-green-700 border-green-300 bg-green-50 hover:bg-green-600 hover:text-white hover:border-green-600'
                              }`}
                              onClick={() => handleToggleActive(p)}
                            >
                              {p.is_active !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staffList.length === 0 && (
                <div className="text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
                  <p className="font-semibold">No staff found for "{staffGroup}".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ── Modals ── */}
      {editingProfile && <EditUserModal profile={editingProfile} profiles={safeProfiles} onClose={() => setEditingProfile(null)} onSave={handleSaveEdit} />}
      {resettingProfile && <ResetPasswordModal profile={resettingProfile} onClose={() => setResettingProfile(null)} onReset={adminResetUserPassword} />}
      {absentProfile && <LeaveRequestModal profile={absentProfile} onClose={() => setAbsentProfile(null)} onSave={applyLeave} />}
      {createdCreds && <CredentialsModal name={createdCreds.name} loginId={createdCreds.loginId} password={createdCreds.password} onClose={() => setCreatedCreds(null)} />}
      {selectedTaskDetail && (
        <TaskDetailModal
          task={selectedTaskDetail}
          workItems={safeWorkItems}
          containers={safeContainers}
          profiles={safeProfiles}
          onClose={() => setSelectedTaskDetail(null)}
        />
      )}
    </div>
  );
}