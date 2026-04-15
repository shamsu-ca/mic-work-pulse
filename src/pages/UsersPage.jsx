import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { supabase } from '../lib/supabaseClient';

const INTERNAL_DOMAIN = '@mic.internal';

// --- Edit User Modal ---
function EditUserModal({ profile, onClose, onSave }) {
  const [editData, setEditData] = useState({
    name: profile.name || '',
    login_id: profile.login_id || '',
    role: profile.role || 'Assignee',
    staff_group: profile.staff_group || 'Office Staff',
    department: profile.department || '',
    manager: profile.manager || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onSave(profile.id, editData);
    setLoading(false);
    onClose();
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">edit</span>
            <h2 className="font-bold text-lg text-on-surface font-headline">Edit Staff Member</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
              <input className={inputCls} value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Login ID</label>
              <input className={inputCls} value={editData.login_id} onChange={e => setEditData({...editData, login_id: e.target.value})} placeholder="e.g. john.doe" />
              <p className="text-[10px] text-on-surface-variant">Used to sign in. Lowercase, no spaces.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Role</label>
              <select className={inputCls} value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                <option value="Assignee">Assignee</option>
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
              <input className={inputCls} value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Manager</label>
              <input className={inputCls} value={editData.manager} onChange={e => setEditData({...editData, manager: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-container">
          <button className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors" onClick={onClose}>Cancel</button>
          <button className="px-5 py-2 text-sm font-bold bg-primary text-white hover:opacity-90 rounded-xl shadow-sm transition-all flex items-center gap-2" onClick={handleSave} disabled={loading}>
            <span className="material-symbols-outlined text-[16px]">save</span>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Password Reset Modal ---
function ResetPasswordModal({ profileId, onClose, onReset }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    setLoading(true);
    setError(null);
    const result = await onReset(profileId, newPassword);
    if (result?.error) setError(result.error);
    else { onClose(); alert('Password successfully reset!'); }
    setLoading(false);
  };

  const inputCls = "bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">lock_reset</span>
            <h2 className="font-bold text-lg text-on-surface font-headline">Reset Password</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <p className="text-error text-sm font-bold bg-error-container/50 px-3 py-2 rounded-xl">{error}</p>}
          <p className="text-sm text-on-surface-variant">Enter a new password for this user.</p>
          <input type="password" required className={inputCls} placeholder="New password (min. 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-bold bg-error text-white hover:opacity-90 rounded-xl transition-opacity" disabled={loading}>
              {loading ? 'Resetting...' : 'Force Reset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function UsersPage() {
  const { profiles, createUser, updateProfile, adminResetUserPassword } = useDataContext();
  const safeProfiles = profiles || [];

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Create user form
  const [newName, setNewName] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Assignee');
  const [newGroup, setNewGroup] = useState('Office Staff');
  const [newDept, setNewDept] = useState('');
  const [newManager, setNewManager] = useState('');

  // Modal state
  const [editingProfile, setEditingProfile] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    return split.length > 1 ? (split[0][0] + split[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newLoginId.trim()) { setErrorMsg("Login ID is required."); return; }
    setLoading(true);
    setErrorMsg(null);

    const email = newLoginId.trim().toLowerCase() + INTERNAL_DOMAIN;
    const { error } = await createUser({
      email,
      password: newPassword,
      full_name: newName,
      role: newRole,
      staff_group: newGroup,
      department: newDept,
      manager: newManager,
      login_id: newLoginId.trim().toLowerCase(),
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsOpen(false);
      setNewName(''); setNewLoginId(''); setNewPassword(''); setNewDept(''); setNewManager('');
    }
    setLoading(false);
  };

  const handleSaveEdit = async (id, editData) => {
    await updateProfile(id, {
      name: editData.name,
      login_id: editData.login_id,
      role: editData.role,
      department: editData.department,
      staff_group: editData.staff_group,
      manager: editData.manager,
    });
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
          <p className="text-on-surface-variant font-medium text-sm">Create and manage access for all staff members. Login IDs are used instead of email addresses.</p>
        </div>
        <button
          className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="material-symbols-outlined text-[18px]">{isOpen ? 'close' : 'person_add'}</span>
          {isOpen ? 'Close' : 'Add User'}
        </button>
      </div>

      {/* Create User Form */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-md shadow-primary/5 border border-primary/20 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary">person_add</span>
            <h3 className="font-bold text-lg font-headline text-on-surface">Create New Staff Member</h3>
          </div>
          {errorMsg && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-bold flex gap-2 items-center">
              <span className="material-symbols-outlined text-[20px]">error</span> {errorMsg}
            </div>
          )}
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Full Name</label>
                <input required className={inputCls} placeholder="e.g. John Doe" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Login ID</label>
                <input required className={inputCls} placeholder="e.g. john.doe" value={newLoginId} onChange={e => setNewLoginId(e.target.value.toLowerCase().replace(/\s+/g, '.'))} />
                <p className="text-[10px] text-on-surface-variant">User will sign in with this ID</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Initial Password</label>
                <input required type="password" className={inputCls} placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Role</label>
                <select className={inputCls} value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="Assignee">Assignee</option>
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
                <label className="text-xs font-bold text-on-surface-variant">Department</label>
                <input className={inputCls} placeholder="Optional" value={newDept} onChange={e => setNewDept(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">Manager</label>
                <input className={inputCls} placeholder="Optional" value={newManager} onChange={e => setNewManager(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2 border-t border-surface-container pt-4">
              <button type="button" className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" onClick={() => setIsOpen(false)}>Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm font-bold bg-primary text-white hover:opacity-90 active:scale-95 rounded-lg shadow-sm transition-all" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
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
                <th className="px-5 py-4">Login ID</th>
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
                        ? <img src={p.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30 flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{getAvatarInitials(p.name)}</div>
                      }
                      <span className="font-semibold text-on-surface">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded text-on-surface-variant">{p.login_id || '—'}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                  </td>
                  <td className="px-5 py-4 text-center font-medium text-on-surface-variant text-xs">{p.staff_group}</td>
                  <td className="px-5 py-4 text-on-surface-variant font-medium text-xs">{p.department || '—'}</td>
                  <td className="px-5 py-4 text-on-surface-variant font-medium text-xs">{p.manager || '—'}</td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low px-3 py-1.5 rounded-lg" onClick={() => setEditingProfile(p)}>Edit</button>
                    <button className="text-xs font-bold text-error hover:text-white hover:bg-error transition-colors border border-error/30 bg-error/5 px-3 py-1.5 rounded-lg" onClick={() => setResettingId(p.id)}>Reset PW</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {safeProfiles.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
              <p className="font-semibold">No staff members found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingProfile && (
        <EditUserModal
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Reset PW Modal */}
      {resettingId && (
        <ResetPasswordModal
          profileId={resettingId}
          onClose={() => setResettingId(null)}
          onReset={handleResetPassword}
        />
      )}
    </div>
  );
}
