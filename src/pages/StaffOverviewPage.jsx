import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus } from '../lib/statusUtils';
import { isItemInDateRange } from '../lib/dateUtils';
import FilterBar from '../components/common/FilterBar';

// ────────────────────────────────────────────────────
// Edit User Modal
// ────────────────────────────────────────────────────
function EditUserModal({ profile, profiles, onClose, onSave }) {
  const [editData, setEditData] = useState({
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role || 'Assignee',
    staff_group: profile.staff_group || 'Office Staff',
    department: profile.department || '',
    manager: profile.manager || '',
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
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Login Email</label>
              <input type="email" className={cls} value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="user@mic.edu" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Role</label>
              <select className={cls} value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                <option value="Assignee">Assignee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Group</label>
              <select className={cls} value={editData.staff_group} onChange={e => setEditData({...editData, staff_group: e.target.value})}>
                <option value="Office Staff">Office Staff</option>
                <option value="Institution">Institution</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
              <input className={cls} value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})} placeholder="Optional" />
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

// ────────────────────────────────────────────────────
// Reset Password Modal
// ────────────────────────────────────────────────────
function ResetPasswordModal({ profile, onClose, onReset }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) { setError('Min. 6 characters.'); return; }
    setLoading(true); setError(null);
    const { error } = await onReset(profile.id, pw);
    setLoading(false);
    if (error) setError(typeof error === 'string' ? error : error.message || 'Reset failed');
    else setDone(true);
  };

  const cls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";

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

// ────────────────────────────────────────────────────
// Credentials Modal
// ────────────────────────────────────────────────────
const generateEmail = (name) => name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@mic.edu';
const generatePassword = () => {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({length: 10}, () => c[Math.floor(Math.random() * c.length)]).join('');
};

function CredentialsModal({ name, email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `MIC WorkPulse Credentials\n\nName: ${name}\nLogin: ${email}\nPassword: ${password}`;
  React.useEffect(() => { navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {}); }, []);
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
            <div className="flex justify-between"><span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Login Email</span><span className="font-mono font-bold text-primary text-sm">{email}</span></div>
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

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════
export default function StaffOverviewPage() {
  const {
    profiles, workItems, staffGroup, dateFilter, customDateRange,
    createUser, adminUpdateProfile, adminResetUserPassword,
  } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  const [pageTab, setPageTab] = useState('Overview'); // 'Overview' | 'Manage'
  const [expandedId, setExpandedId] = useState(null);
  const [deptFilter, setDeptFilter] = useState('All');

  // Manage tab state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Assignee');
  const [newGroup, setNewGroup] = useState('Office Staff');
  const [newDept, setNewDept] = useState('');
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

  // Staff filtered by toggle
  const staffList = safeProfiles.filter(p => p.role !== 'Admin' && p.staff_group === staffGroup);
  const departments = ['All', ...new Set(staffList.map(p => p.department).filter(Boolean))];
  const filteredStaff = deptFilter === 'All' ? staffList : staffList.filter(s => s.department === deptFilter);

  // Metrics for a staff member — filtered by date
  const getMetrics = (staffId) => {
    const allTasks = safeWorkItems.filter(t => t.assignee_id === staffId);
    // Apply date filter
    const tasks = allTasks.filter(t => isItemInDateRange(t, dateFilter, customDateRange));
    let overdue = 0, notStarted = 0, ongoing = 0, completed = 0, assigned = 0;
    tasks.forEach(t => {
      const s = getDisplayStatus(t);
      if (s === 'Completed') completed++;
      else if (s === 'Overdue') overdue++;
      else if (s === 'Ongoing') ongoing++;
      else if (s === 'Not Started') notStarted++;
      else assigned++;
    });
    const total = tasks.length;
    const efficiency = total === 0 ? 0 : Math.round((completed / total) * 100);
    const workload = total === 0 ? 0 : Math.min(100, Math.round(((overdue * 2 + ongoing + assigned) / Math.max(total, 8)) * 100));
    return { overdue, notStarted, ongoing, completed, assigned, total, efficiency, workload, tasks };
  };

  // Create user handler
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setCreateError('Name is required.'); return; }
    setCreateLoading(true); setCreateError(null);
    const email = generateEmail(newName);
    const password = generatePassword();
    const { error } = await createUser({ email, password, full_name: newName, role: newRole, staff_group: newGroup, department: newDept, manager: newManager });
    setCreateLoading(false);
    if (error) { setCreateError(error.message); return; }
    setIsCreateOpen(false);
    setNewName(''); setNewDept(''); setNewManager('');
    setCreatedCreds({ name: newName, email, password });
  };

  const handleSaveEdit = async (id, editData) => {
    const { error } = await adminUpdateProfile(id, {
      name: editData.name, email: editData.email, role: editData.role,
      department: editData.department, staff_group: editData.staff_group, manager: editData.manager,
    });
    return { error: error?.message || null };
  };

  const inputCls = "bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full";

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">
              {pageTab === 'Overview' ? 'Staff Distribution & Velocity' : 'Manage Staff'}
            </h1>
            <p className="text-sm text-on-surface-variant font-medium">
              {pageTab === 'Overview'
                ? `Performance metrics — ${staffGroup}`
                : 'Create, edit, and manage staff accounts'}
            </p>
          </div>

          {/* Action buttons group */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Overview / Manage Staff toggle buttons — side by side, always visible */}
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

            {/* Add User button in Manage tab */}
            {pageTab === 'Manage' && (
              <button onClick={() => setIsCreateOpen(true)} className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-1.5 hover:opacity-90">
                <span className="material-symbols-outlined text-[16px]">person_add</span>Add User
              </button>
            )}

            {/* Dept filter in Overview tab */}
            {pageTab === 'Overview' && (
              <select className="bg-white border border-outline-variant/40 rounded-xl px-3 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* FilterBar — both toggle + date for staff overview */}
        <FilterBar showToggle={true} showDateFilter={true} />
      </div>

      {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
      {pageTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStaff.map(staff => {
            const m = getMetrics(staff.id);
            const isExpanded = expandedId === staff.id;
            const isOverloaded = m.overdue > 0;

            return (
              <div
                key={staff.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${isExpanded ? 'border-primary/40 shadow-md md:col-span-2' : 'border-outline-variant/30 hover:shadow-md cursor-pointer'}`}
                onClick={() => setExpandedId(isExpanded ? null : staff.id)}
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {staff.avatar_url
                      ? <img src={staff.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-outline-variant/20 flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm border-2 border-primary/20 flex-shrink-0">{getAvatarInitials(staff.name)}</div>
                    }
                    <div>
                      <p className="font-bold text-on-surface leading-tight">{staff.name}</p>
                      <p className="text-xs text-on-surface-variant font-medium">{staff.department || staff.staff_group}</p>
                      {staff.manager && <p className="text-[10px] text-on-surface-variant">↑ {staff.manager}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${isOverloaded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isOverloaded ? '⚠ OVERLOADED' : '● ACTIVE'}
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] transition-transform duration-200 flex-shrink-0" style={{transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>expand_more</span>
                  </div>
                </div>

                {/* ROW 1 — Alert boxes: Overdue & Not Started */}
                <div className="px-5 pb-3 grid grid-cols-2 gap-3">
                  {/* Overdue */}
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Overdue</p>
                    <p className="text-3xl font-black text-red-600 mt-1 leading-none">{String(m.overdue).padStart(2, '0')}</p>
                    <p className="text-[10px] text-red-400 mt-1.5 font-medium">tasks past due date</p>
                  </div>
                  {/* Not Started */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Not Started</p>
                    <p className="text-3xl font-black text-amber-600 mt-1 leading-none">{String(m.notStarted).padStart(2, '0')}</p>
                    <p className="text-[10px] text-amber-400 mt-1.5 font-medium">pending kick-off</p>
                  </div>
                </div>

                {/* ROW 2 — Count boxes: Assigned, Ongoing, Completed */}
                <div className="px-5 pb-3 grid grid-cols-3 gap-3">
                  <div className="bg-surface-container rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Assigned</p>
                    <p className="text-2xl font-black text-on-surface mt-1">{String(m.assigned).padStart(2, '0')}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Ongoing</p>
                    <p className="text-2xl font-black text-blue-700 mt-1">{String(m.ongoing).padStart(2, '0')}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Completed</p>
                    <p className="text-2xl font-black text-green-700 mt-1">{String(m.completed).padStart(2, '0')}</p>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="px-5 pb-4 flex flex-col gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                      <span>WORK EFFICIENCY</span>
                      <span className="text-primary font-black">{m.efficiency}% AVERAGE</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{width: `${m.efficiency}%`}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                      <span>WORKLOAD CAPACITY</span>
                      <span className={m.workload > 80 ? 'text-error font-black' : 'font-black'}>{m.workload}% CAP</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${m.workload > 80 ? 'bg-error' : 'bg-on-surface-variant/60'}`} style={{width: `${m.workload}%`}}></div>
                    </div>
                  </div>
                </div>

                {/* Expanded: active task list */}
                {isExpanded && (
                  <div className="border-t border-surface-container-high mx-5 pt-4 pb-5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-xs font-bold text-primary border-b-2 border-primary pb-1">Active Tasks ({m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').length})</span>
                      <span className="text-xs text-on-surface-variant">Queue ({m.ongoing})</span>
                      <span className="text-xs text-on-surface-variant">Archived ({m.completed})</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').map(t => {
                        const s = getDisplayStatus(t);
                        const isOverdue = s === 'Overdue';
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-error' : 'bg-primary'}`}></span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                                <p className="text-[10px] text-on-surface-variant">{t.type || 'Task'}{t.expected_date ? ` · Due ${t.expected_date}` : ''}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ml-2 ${isOverdue ? 'bg-red-100 text-red-700' : s === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant'}`}>{s}</span>
                          </div>
                        );
                      })}
                      {m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').length === 0 && (
                        <p className="text-xs text-on-surface-variant italic text-center py-4">No active tasks in this period.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredStaff.length === 0 && (
            <div className="col-span-2 text-center py-20 text-on-surface-variant bg-white rounded-2xl border border-outline-variant/30">
              <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
              <p className="font-bold">No staff in <strong>{staffGroup}</strong>{deptFilter !== 'All' ? ` (${deptFilter})` : ''}.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ MANAGE TAB ═══════════════════ */}
      {pageTab === 'Manage' && (
        <div className="flex flex-col gap-4">
          {/* Create form (collapsible) */}
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
                    <input required className={inputCls} placeholder="e.g. Rahul AB" value={newName} onChange={e => setNewName(e.target.value)} />
                    {newName && <p className="text-[10px] text-primary font-semibold">→ <span className="font-mono">{generateEmail(newName)}</span></p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Department</label>
                    <input className={inputCls} placeholder="Optional" value={newDept} onChange={e => setNewDept(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Role</label>
                    <select className={inputCls} value={newRole} onChange={e => setNewRole(e.target.value)}>
                      <option value="Assignee">Assignee</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Group</label>
                    <select className={inputCls} value={newGroup} onChange={e => setNewGroup(e.target.value)}>
                      <option value="Office Staff">Office Staff</option>
                      <option value="Institution">Institution</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Manager</label>
                    <select className={inputCls} value={newManager} onChange={e => setNewManager(e.target.value)}>
                      <option value="">— None —</option>
                      {safeProfiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
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

          {/* Staff table */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-container-lowest/80 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Login Email</th>
                    <th className="px-5 py-4 text-center">Role</th>
                    <th className="px-5 py-4 text-center">Group</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Manager</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {safeProfiles.map(p => (
                    <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30 flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{getAvatarInitials(p.name)}</div>
                          }
                          <span className="font-semibold text-on-surface">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{p.email || <span className="italic text-outline text-xs">not set</span>}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : p.role === 'Manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-on-surface-variant">{p.staff_group || '—'}</td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">{p.department || '—'}</td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">{p.manager || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button className="text-xs font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all" onClick={() => setEditingProfile(p)}>Edit</button>
                          <button className="text-xs font-bold text-error border border-error/30 bg-error/5 hover:bg-error hover:text-white px-3 py-1.5 rounded-lg transition-all" onClick={() => setResettingProfile(p)}>Reset PW</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {safeProfiles.length === 0 && (
                <div className="text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
                  <p className="font-semibold">No staff yet. Click "Add User" to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingProfile && <EditUserModal profile={editingProfile} profiles={safeProfiles} onClose={() => setEditingProfile(null)} onSave={handleSaveEdit} />}
      {resettingProfile && <ResetPasswordModal profile={resettingProfile} onClose={() => setResettingProfile(null)} onReset={adminResetUserPassword} />}
      {createdCreds && <CredentialsModal name={createdCreds.name} email={createdCreds.email} password={createdCreds.password} onClose={() => setCreatedCreds(null)} />}
    </div>
  );
}
