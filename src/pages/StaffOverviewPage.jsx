import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits } from '../lib/statusUtils';
import { fmtDate } from '../lib/dateUtils';
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
      setError(typeof result.error === 'string' ? result.error : result.error?.message || 'Reset failed. Edge function may not be deployed.');
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

export default function StaffOverviewPage() {
  const {
    profiles, workItems, staffGroup,
    createUser, adminUpdateProfile, adminResetUserPassword,
  } = useDataContext();
  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];

  const [pageTab, setPageTab] = useState('Overview');
  const [expandedId, setExpandedId] = useState(null);
  const [deptFilter, setDeptFilter] = useState('All');

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

  const staffList = safeProfiles.filter(p => p.role !== 'Admin');
  const departments = ['All', ...new Set(staffList.map(p => p.department).filter(Boolean))];
  const filteredStaff = staffList
    .filter(s => (s.category || 'Office Staff') === staffGroup)
    .filter(s => deptFilter === 'All' || s.department === deptFilter);

  const getMetrics = (staffId) => {
    const allTasks = safeWorkItems.filter(t => t.assignee_id === staffId);
    const tasks = getActionableUnits(allTasks); // live view — no date filter

    let assigned = 0, ongoing = 0, completed = 0, overdue = 0;
    tasks.forEach(t => {
      if (t.status === 'Assigned') assigned++;
      else if (t.status === 'Ongoing') ongoing++;
      else if (t.status === 'Completed') completed++;
      if (isOverdue(t) && t.status !== 'Completed') overdue++;
    });

    const total = tasks.length;
    const efficiency = total === 0 ? 0 : Math.round((completed / total) * 100);
    const workload = total === 0 ? 0 : Math.min(100, Math.round(((overdue * 2 + ongoing + assigned) / Math.max(total, 8)) * 100));
    return {
      overdue,
      notStarted: assigned,  // all assigned tasks are logically "Not Started"
      assigned,
      ongoing,
      completed,
      total,
      active: assigned + ongoing,
      efficiency,
      workload,
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
    });
    console.log('Save result:', error);
    return { error: error?.message || error || null };
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
              <button onClick={() => setIsCreateOpen(true)} className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-1.5 hover:opacity-90">
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
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-outline-variant/20">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s === 'Overdue' ? 'bg-error' : s === 'Ongoing' ? 'bg-blue-500' : s === 'Completed' ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">{t.title}</p>
                    <p className="text-[10px] text-on-surface-variant">{t.expected_date ? `Due ${fmtDate(t.expected_date)}` : 'No date'}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${typeChip(t.type)}`}>{t.type || 'Task'}</span>
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
                onClick={() => setExpandedId(isExpanded ? null : staff.id)}
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

                {/* ── Overdue + Not Started ── */}
                <div className="px-5 pb-3 grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 ${m.overdue > 0 ? 'bg-red-50 border border-red-100' : 'bg-surface-container-low'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${m.overdue > 0 ? 'text-error' : 'text-on-surface-variant'}`}>Overdue</p>
                    <p className={`text-2xl font-black ${m.overdue > 0 ? 'text-error' : 'text-on-surface-variant'}`}>{m.overdue}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${m.notStarted > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-surface-container-low'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${m.notStarted > 0 ? 'text-amber-700' : 'text-on-surface-variant'}`}>Not Started</p>
                    <p className={`text-2xl font-black ${m.notStarted > 0 ? 'text-amber-600' : 'text-on-surface'}`}>{m.notStarted}</p>
                  </div>
                </div>

                {/* ── Assigned / Ongoing / Completed ── */}
                <div className="px-5 pb-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Assigned', val: m.assigned, cls: 'text-on-surface' },
                    { label: 'Ongoing',  val: m.ongoing,  cls: 'text-blue-600' },
                    { label: 'Completed',val: m.completed, cls: 'text-green-600' },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="bg-surface-container-low rounded-xl py-2.5">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{label}</p>
                      <p className={`text-lg font-black ${cls}`}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* ── Work Efficiency ── */}
                <div className="px-5 pb-2">
                  <div className="flex justify-between text-[9px] font-bold text-on-surface-variant mb-1">
                    <span>WORK EFFICIENCY</span>
                    <span className="text-primary font-black">{m.efficiency}% AVERAGE</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.efficiency < 40 ? 'bg-error' : m.efficiency < 70 ? 'bg-amber-400' : 'bg-primary'}`} style={{width:`${m.efficiency}%`}}></div>
                  </div>
                </div>

                {/* ── Workload Capacity ── */}
                <div className="px-5 pb-4">
                  <div className="flex justify-between text-[9px] font-bold text-on-surface-variant mb-1">
                    <span>WORKLOAD CAPACITY</span>
                    <span className={`font-black ${m.workload > 85 ? 'text-error' : 'text-primary'}`}>{m.workload}% CAP</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.workload > 85 ? 'bg-error' : m.workload > 60 ? 'bg-amber-400' : 'bg-primary'}`} style={{width:`${m.workload}%`}}></div>
                  </div>
                </div>

                {/* ── Expanded Detail ── */}
                {isExpanded && (
                  <div className="border-t border-surface-container-high mx-0 px-5 pt-5 pb-5 bg-surface-container-low/30 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

                    {/* Work Items Summary */}
                    <div>
                      <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">list_alt</span>
                        Work Items Summary
                      </p>
                      <div className="flex flex-col gap-3">
                        {overdueTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-error mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-error rounded-full inline-block"></span>
                              Overdue ({overdueTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{overdueTasks.slice(0,3).map(taskRow)}</div>
                          </div>
                        )}
                        {ongoingTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                              Ongoing ({ongoingTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{ongoingTasks.slice(0,3).map(taskRow)}</div>
                          </div>
                        )}
                        {notStartedTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-amber-400 rounded-full inline-block"></span>
                              Not Started ({notStartedTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{notStartedTasks.slice(0,3).map(taskRow)}</div>
                          </div>
                        )}
                        {assignedTasks.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 bg-outline rounded-full inline-block"></span>
                              Assigned ({assignedTasks.length})
                            </p>
                            <div className="flex flex-col gap-1.5">{assignedTasks.slice(0,3).map(taskRow)}</div>
                          </div>
                        )}
                        {activeTasks.length === 0 && (
                          <p className="text-xs text-on-surface-variant italic text-center py-4">No active tasks in this period.</p>
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
                          <div>
                            <p className="font-semibold text-on-surface leading-tight">{p.name}</p>
                            {p.position && <p className="text-[10px] text-primary font-bold">{p.position}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{p.email || <span className="italic text-outline text-xs">not set</span>}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                      </td>
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

      {editingProfile && <EditUserModal profile={editingProfile} profiles={safeProfiles} onClose={() => setEditingProfile(null)} onSave={handleSaveEdit} />}
      {resettingProfile && <ResetPasswordModal profile={resettingProfile} onClose={() => setResettingProfile(null)} onReset={adminResetUserPassword} />}
      {createdCreds && <CredentialsModal name={createdCreds.name} loginId={createdCreds.loginId} password={createdCreds.password} onClose={() => setCreatedCreds(null)} />}
    </div>
  );
}