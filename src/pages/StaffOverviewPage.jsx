import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus } from '../lib/statusUtils';

// ────────────────────────────────────────────────────
// Edit User Modal (inline, no separate page needed)
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
    setLoading(true);
    setError(null);
    const result = await onSave(profile.id, editData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else onClose();
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
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
              <input className={inputCls} value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Login Email</label>
              <input type="email" className={inputCls} value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="user@mic.edu" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Role</label>
              <select className={inputCls} value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                <option value="Assignee">Assignee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Group</label>
              <select className={inputCls} value={editData.staff_group} onChange={e => setEditData({...editData, staff_group: e.target.value})}>
                <option value="Office Staff">Office Staff</option>
                <option value="Institution">Institution</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
              <input className={inputCls} value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Manager</label>
              <select className={inputCls} value={editData.manager} onChange={e => setEditData({...editData, manager: e.target.value})}>
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
    if (error) setError(typeof error === 'string' ? error : error.message || 'Failed');
    else setDone(true);
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";

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
            <p className="font-bold text-on-surface">Password reset successfully!</p>
            <button className="mt-2 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {error && <p className="text-error text-sm font-bold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <p className="text-sm text-on-surface-variant">Set a new password for <strong>{profile.name}</strong>.</p>
            <input type="password" className={inputCls} placeholder="New password (min 6 chars)" value={pw} onChange={e => setPw(e.target.value)} required />
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
// Create User + Credentials modal (inside Manage tab)
// ────────────────────────────────────────────────────
const generateEmail = (name) => name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@mic.edu';
const generatePassword = () => {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({length: 10}, () => c[Math.floor(Math.random() * c.length)]).join('');
};

function CredentialsModal({ name, email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `MIC WorkPulse Credentials\n\nName: ${name}\nLogin Email: ${email}\nPassword: ${password}\n\nPlease sign in and change your password.`;
  React.useEffect(() => { navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {}); }, []);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1002] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 py-5 bg-green-50 border-b border-green-100 rounded-t-2xl">
          <span className="material-symbols-outlined text-green-600 text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          <div>
            <p className="font-bold text-lg font-headline">User Created!</p>
            <p className="text-xs text-green-700 font-medium">Credentials auto-copied ✓</p>
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
            <button className={`flex-1 py-2.5 text-sm font-bold border rounded-xl flex items-center justify-center gap-2 transition-colors ${copied ? 'border-green-400 bg-green-50 text-green-700' : 'border-outline-variant'}`} onClick={() => { navigator.clipboard.writeText(text); setCopied(true); }}>
              <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>{copied ? 'Copied!' : 'Copy Again'}
            </button>
            <button className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE — combines Overview + Manage tabs
// ════════════════════════════════════════════════════
export default function StaffOverviewPage() {
  const { profiles, workItems, staffGroup, createUser, adminUpdateProfile, adminResetUserPassword } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  // Page tabs
  const [pageTab, setPageTab] = useState('Overview'); // 'Overview' | 'Manage'

  // Overview state
  const [expandedId, setExpandedId] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Manage state
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

  // ── Shared helpers ──
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  // Staff filtered by toggle
  const staffList = safeProfiles.filter(p => p.role !== 'Admin' && p.staff_group === staffGroup);
  const departments = ['All', ...new Set(staffList.map(p => p.department).filter(Boolean))];
  const filteredStaff = departmentFilter === 'All' ? staffList : staffList.filter(s => s.department === departmentFilter);

  // ── Metrics ──
  const getMetrics = (staffId) => {
    const tasks = safeWorkItems.filter(t => t.assignee_id === staffId);
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

  // ── Create user ──
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

  // ── Edit save via edge function ──
  const handleSaveEdit = async (id, editData) => {
    const { error } = await adminUpdateProfile(id, {
      name: editData.name, email: editData.email, role: editData.role,
      department: editData.department, staff_group: editData.staff_group, manager: editData.manager,
    });
    return { error: error?.message || null };
  };

  const inputCls = "bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full";

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">
            {pageTab === 'Overview' ? 'Staff Distribution & Velocity' : 'Manage Staff'}
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            {pageTab === 'Overview'
              ? `Real-time performance — ${staffGroup}`
              : 'Create, edit, and manage staff accounts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Page tab toggle */}
          <div className="flex gap-1 bg-surface-container p-1 rounded-xl">
            <button
              onClick={() => setPageTab('Overview')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${pageTab === 'Overview' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >Overview</button>
            <button
              onClick={() => setPageTab('Manage')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${pageTab === 'Manage' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              Manage Staff
            </button>
          </div>
          {pageTab === 'Overview' && (
            <select className="bg-white border border-outline-variant/40 rounded-lg px-3 py-2 text-sm font-bold shadow-sm" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
              {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>
          )}
          {pageTab === 'Manage' && (
            <button onClick={() => setIsCreateOpen(true)} className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90">
              <span className="material-symbols-outlined text-[18px]">person_add</span>Add User
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
      {pageTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStaff.map(staff => {
            const m = getMetrics(staff.id);
            const isExpanded = expandedId === staff.id;
            const isOverloaded = m.overdue > 0;
            return (
              <div key={staff.id} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary/40 shadow-md md:col-span-2' : 'border-outline-variant/30 hover:shadow-md cursor-pointer'}`}
                onClick={() => setExpandedId(isExpanded ? null : staff.id)}>
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {staff.avatar_url
                      ? <img src={staff.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-outline-variant/20" />
                      : <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm border-2 border-primary/20">{getAvatarInitials(staff.name)}</div>
                    }
                    <div>
                      <p className="font-bold text-on-surface">{staff.name}</p>
                      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{staff.department || 'No Department'}</p>
                      {staff.manager && <p className="text-[10px] text-on-surface-variant">↑ {staff.manager}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isOverloaded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isOverloaded ? '⚠ Overloaded' : '● Active'}
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] transition-transform duration-200" style={{transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>expand_more</span>
                  </div>
                </div>
                <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Overdue</p>
                    <p className="text-2xl font-black text-red-600 mt-1">{String(m.overdue).padStart(2,'0')}</p>
                    <p className="text-[10px] text-red-500 mt-1">Not Started: {String(m.notStarted).padStart(2,'0')}</p>
                  </div>
                  <div className="bg-surface-container rounded-xl p-3">
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2"><span>Assigned</span><span>Ongoing</span><span>Done</span></div>
                    <div className="flex justify-between text-lg font-black text-on-surface">
                      <span>{String(m.assigned).padStart(2,'0')}</span><span>{String(m.ongoing).padStart(2,'0')}</span><span>{String(m.completed).padStart(2,'0')}</span>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4 flex flex-col gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1"><span>WORK EFFICIENCY</span><span className="text-primary">{m.efficiency}%</span></div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width: `${m.efficiency}%`}}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1"><span>WORKLOAD CAPACITY</span><span className={m.workload > 80 ? 'text-error' : ''}>{m.workload}% CAP</span></div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden"><div className={`h-full rounded-full ${m.workload > 80 ? 'bg-error' : 'bg-on-surface-variant'}`} style={{width: `${m.workload}%`}}></div></div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-surface-container-high mx-5 pt-4 pb-5">
                    <p className="text-xs font-bold text-primary mb-3">Active Tasks ({m.total - m.completed})</p>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').map(t => {
                        const s = getDisplayStatus(t);
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${s === 'Overdue' ? 'bg-error' : 'bg-primary'}`}></span>
                              <div>
                                <p className="text-sm font-semibold text-on-surface">{t.title}</p>
                                <p className="text-[10px] text-on-surface-variant">{t.expected_date ? `Due ${t.expected_date}` : 'No due date'}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s === 'Overdue' ? 'bg-red-100 text-red-700' : s === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container text-on-surface-variant'}`}>{s}</span>
                          </div>
                        );
                      })}
                      {m.tasks.filter(t => getDisplayStatus(t) !== 'Completed').length === 0 && <p className="text-xs text-on-surface-variant italic">No active tasks.</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredStaff.length === 0 && (
            <div className="col-span-2 text-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
              <p className="font-bold">No staff in <strong>{staffGroup}</strong>{departmentFilter !== 'All' ? ` — ${departmentFilter}` : ''}.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ MANAGE TAB ═══════════════════ */}
      {pageTab === 'Manage' && (
        <div className="flex flex-col gap-4">
          {/* Create form */}
          {isCreateOpen && (
            <div className="bg-white rounded-xl shadow-sm border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">person_add</span>
                <div>
                  <h3 className="font-bold font-headline text-on-surface">Add New Staff Member</h3>
                  <p className="text-xs text-on-surface-variant">Login email and password auto-generated.</p>
                </div>
              </div>
              {createError && <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-bold mb-4">{createError}</div>}
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">Full Name *</label>
                    <input required className={inputCls} placeholder="e.g. Name AB" value={newName} onChange={e => setNewName(e.target.value)} />
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30 flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{getAvatarInitials(p.name)}</div>
                          }
                          <span className="font-semibold text-on-surface">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-on-surface-variant">{p.email || <span className="italic text-outline">not set</span>}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : p.role === 'Manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                      </td>
                      <td className="px-5 py-4 text-center text-xs text-on-surface-variant">{p.staff_group}</td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant">{p.department || '—'}</td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant">{p.manager || '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button className="text-xs font-bold text-on-surface-variant hover:text-primary bg-surface-container-low px-3 py-1.5 rounded-lg transition-colors" onClick={() => setEditingProfile(p)}>Edit</button>
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
                  <p className="font-semibold">No staff yet. Click "Add User".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingProfile && (
        <EditUserModal profile={editingProfile} profiles={safeProfiles} onClose={() => setEditingProfile(null)} onSave={handleSaveEdit} />
      )}
      {resettingProfile && (
        <ResetPasswordModal profile={resettingProfile} onClose={() => setResettingProfile(null)} onReset={adminResetUserPassword} />
      )}
      {createdCreds && (
        <CredentialsModal name={createdCreds.name} email={createdCreds.email} password={createdCreds.password} onClose={() => setCreatedCreds(null)} />
      )}
    </div>
  );
}
