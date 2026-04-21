import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';

// Auto-generate login email from name
const generateEmail = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '') + '@mic.edu';
};

// Generate a secure temp password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// --- Edit User Modal ---
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
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">edit</span>
            <h2 className="font-bold text-lg text-on-surface font-headline">Edit Staff Member</h2>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-sm font-semibold flex gap-2">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">error</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
              <input className={inputCls} value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Login Email</label>
              <input type="email" className={inputCls} value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="user@email.com" />
              <p className="text-[10px] text-on-surface-variant">Displayed for your records only.</p>
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
          <button className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-5 py-2 text-sm font-bold bg-primary text-white hover:opacity-90 rounded-xl shadow-sm transition-all flex items-center gap-2" onClick={handleSave} disabled={loading}>
            <span className="material-symbols-outlined text-[16px]">save</span>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Reset Password Modal ---
function ResetPasswordModal({ profile, onClose, onReset }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { setError("Min. 6 characters."); return; }
    setLoading(true);
    setError(null);
    const { error } = await onReset(profile.id, newPassword);
    if (error) {
      setError(typeof error === 'string' ? error : error.message || 'Failed');
    } else {
      onClose();
      alert(`Password for ${profile.name} reset successfully.`);
    }
    setLoading(false);
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">lock_reset</span>
            <div>
              <p className="font-bold text-on-surface font-headline">Reset Password</p>
              <p className="text-xs text-on-surface-variant">{profile.name}</p>
            </div>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <p className="text-error text-sm font-bold bg-error-container/50 px-3 py-2 rounded-xl">{error}</p>}
          <p className="text-sm text-on-surface-variant">Enter the new password for this staff member.</p>
          <input type="password" className={inputCls} placeholder="New password (min. 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-bold bg-error text-white hover:opacity-90 rounded-xl flex items-center gap-2" disabled={loading}>
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              {loading ? 'Resetting...' : 'Force Reset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Credentials Created Modal ---
function CredentialsModal({ name, email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `MIC WorkPulse Login Credentials\n\nName: ${name}\nLogin Email: ${email}\nPassword: ${password}\n\nPlease log in at the app and change your password.`;

  // Auto-copy when modal opens
  React.useEffect(() => {
    navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1002] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-md flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 bg-green-50 border-b border-green-100 rounded-t-2xl">
          <span className="material-symbols-outlined text-green-600 text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          <div>
            <p className="font-bold text-on-surface font-headline text-lg">User Created!</p>
            <p className="text-xs text-green-700 font-medium">Credentials auto-copied to clipboard ✓</p>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-on-surface-variant">Share these credentials with <strong className="text-on-surface">{name}</strong>. They must sign in and change their password.</p>
          <div className="bg-slate-50 border border-outline-variant/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Name</span>
              <span className="font-semibold text-on-surface text-sm">{name}</span>
            </div>
            <div className="h-px bg-outline-variant/30"></div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Login Email</span>
              <span className="font-mono font-bold text-primary text-sm">{email}</span>
            </div>
            <div className="h-px bg-outline-variant/30"></div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Temp Password</span>
              <span className="font-mono font-bold text-error text-sm tracking-widest">{password}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              className={`flex-1 py-2.5 text-sm font-bold border rounded-xl flex items-center justify-center gap-2 transition-colors ${
                copied ? 'border-green-400 bg-green-50 text-green-700' : 'border-outline-variant hover:bg-surface-container text-on-surface'
              }`}
              onClick={handleCopy}
            >
              <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copied!' : 'Copy Again'}
            </button>
            <button
              className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 transition-opacity"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function UsersPage() {
  const { profiles, createUser, adminUpdateProfile, adminResetUserPassword } = useDataContext();
  const safeProfiles = profiles || [];

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Create form — simple fields only
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Assignee');
  const [newGroup, setNewGroup] = useState('Office Staff');
  const [newDept, setNewDept] = useState('');
  const [newManager, setNewManager] = useState('');

  // After creation: show credentials
  const [createdCreds, setCreatedCreds] = useState(null);

  // Modals
  const [editingProfile, setEditingProfile] = useState(null);
  const [resettingProfile, setResettingProfile] = useState(null);

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setErrorMsg("Full name is required."); return; }
    setLoading(true);
    setErrorMsg(null);

    const email = generateEmail(newName);
    const password = generatePassword();

    const { error } = await createUser({
      email,
      password,
      full_name: newName,
      role: newRole,
      staff_group: newGroup,
      department: newDept,
      manager: newManager,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsOpen(false);
      setNewName(''); setNewDept(''); setNewManager('');
      setCreatedCreds({ name: newName, email, password });
    }
    setLoading(false);
  };

  const handleSaveEdit = async (id, editData) => {
    // Use edge function (service role) to bypass RLS for admin editing other profiles
    const { error } = await adminUpdateProfile(id, {
      name: editData.name,
      email: editData.email,
      role: editData.role,
      department: editData.department,
      staff_group: editData.staff_group,
      manager: editData.manager,
    });
    if (error) return { error: error.message || JSON.stringify(error) };
    return { error: null };
  };

  const handleResetPassword = async (targetId, newPassword) => {
    const { error } = await adminResetUserPassword(targetId, newPassword);
    return { error };
  };

  const inputCls = "bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full";

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">User Management</h1>
        </div>
        <button
          className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="material-symbols-outlined text-[18px]">{isOpen ? 'close' : 'person_add'}</span>
          {isOpen ? 'Close' : 'Add User'}
        </button>
      </div>

      {/* Create User Form — no email/password fields */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-md shadow-primary/5 border border-primary/20 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person_add</span>
            <div>
              <h3 className="font-bold text-lg font-headline text-on-surface">Add New Staff Member</h3>
              <p className="text-xs text-on-surface-variant">Login email and password will be auto-generated.</p>
            </div>
          </div>
          {errorMsg && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-bold flex gap-2 items-center">
              <span className="material-symbols-outlined text-[20px]">error</span> {errorMsg}
            </div>
          )}
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Full Name <span className="text-error">*</span></label>
                <input required className={inputCls} placeholder="e.g. Name AB" value={newName} onChange={e => setNewName(e.target.value)} />
                {newName && (
                  <p className="text-[10px] text-primary font-semibold">
                    → Login email will be: <span className="font-mono">{generateEmail(newName)}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Department</label>
                <input className={inputCls} placeholder="Optional" value={newDept} onChange={e => setNewDept(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {safeProfiles.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-surface-container pt-4">
              <button type="button" className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" onClick={() => setIsOpen(false)}>Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm font-bold bg-primary text-white hover:opacity-90 active:scale-95 rounded-lg shadow-sm transition-all flex items-center gap-2" disabled={loading}>
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
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
                <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30 flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{getAvatarInitials(p.name)}</div>
                      }
                      <span className="font-semibold text-on-surface">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.email
                      ? <span className="text-xs text-on-surface-variant font-mono">{p.email}</span>
                      : <span className="text-xs text-outline italic">not set — click Edit</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                  </td>
                  <td className="px-5 py-4 text-center text-xs font-medium text-on-surface-variant">{p.staff_group}</td>
                  <td className="px-5 py-4 text-xs font-medium text-on-surface-variant">{p.department || '—'}</td>
                  <td className="px-5 py-4 text-xs font-medium text-on-surface-variant">{p.manager || '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low px-3 py-1.5 rounded-lg" onClick={() => setEditingProfile(p)}>Edit</button>
                      <button className="text-xs font-bold text-error hover:text-white hover:bg-error transition-colors border border-error/30 bg-error/5 px-3 py-1.5 rounded-lg" onClick={() => setResettingProfile(p)}>Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {safeProfiles.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
              <p className="font-semibold">No staff members yet. Click "Add User" to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editingProfile && (
        <EditUserModal
          profile={editingProfile}
          profiles={safeProfiles}
          onClose={() => setEditingProfile(null)}
          onSave={handleSaveEdit}
        />
      )}

      {resettingProfile && (
        <ResetPasswordModal
          profile={resettingProfile}
          onClose={() => setResettingProfile(null)}
          onReset={handleResetPassword}
        />
      )}

      {createdCreds && (
        <CredentialsModal
          name={createdCreds.name}
          email={createdCreds.email}
          password={createdCreds.password}
          onClose={() => setCreatedCreds(null)}
        />
      )}
    </div>
  );
}
