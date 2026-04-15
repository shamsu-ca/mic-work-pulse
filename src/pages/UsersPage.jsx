import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { supabase } from '../lib/supabaseClient';

export default function UsersPage() {
  const { profiles, createUser, updateProfile, adminResetUserPassword } = useDataContext();
  const safeProfiles = profiles || [];
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Assignee');
  const [newGroup, setNewGroup] = useState('Office Staff');
  const [newDept, setNewDept] = useState('');
  const [newManager, setNewManager] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editEmailLoading, setEditEmailLoading] = useState(false);

  // Reset Password State
  const [resettingId, setResettingId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const { error } = await createUser({
      email: newEmail,
      password: newPassword,
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
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewDept(''); setNewManager('');
    }
    setLoading(false);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditData({
      name: p.name,
      role: p.role,
      department: p.department || '',
      staff_group: p.staff_group || 'Office Staff',
      manager: p.manager || '',
      email: p.email || '',            // for display — pulled from auth, not profiles table
      newEmail: '',                      // what admin wants to change it to
    });
  };

  const saveEdit = async () => {
    setEditLoading(true);
    await updateProfile(editingId, {
      name: editData.name,
      role: editData.role,
      department: editData.department,
      staff_group: editData.staff_group,
      manager: editData.manager,
    });

    // If a new email was typed, update it via the edge function
    if (editData.newEmail && editData.newEmail !== editData.email) {
      setEditEmailLoading(true);
      const { error } = await supabase.functions.invoke('update-user-password', {
        body: { targetUserId: editingId, newEmail: editData.newEmail }
      });
      if (error) alert('Profile saved, but email update failed: ' + error.message);
      setEditEmailLoading(false);
    }
    setEditLoading(false);
    setEditingId(null);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPassword) return;
    setResetLoading(true);
    setResetError(null);
    const { error } = await adminResetUserPassword(resettingId, resetPassword);
    if (error) {
       setResetError(error.message || "Failed to reset password.");
    } else {
       setResettingId(null);
       setResetPassword('');
       alert("Password successfully reset!");
    }
    setResetLoading(false);
  };

  const inputCls = "bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full";

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">User Management</h1>
          <p className="text-on-surface-variant font-medium text-sm">Create and manage access levels for all staff members.</p>
        </div>
        <button 
          className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="material-symbols-outlined text-[18px]">{isOpen ? 'close' : 'person_add'}</span> 
          {isOpen ? 'Close' : 'Add User'}
        </button>
      </div>

      {isOpen && (
        <div className="bg-white rounded-xl shadow-md shadow-primary/5 border border-primary/20 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">person_add</span>
            <h3 className="font-bold text-lg font-headline text-on-surface">Create New User</h3>
          </div>
          {errorMsg && <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-bold flex gap-2 items-center"><span className="material-symbols-outlined text-[20px]">error</span> {errorMsg}</div>}
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input required className={inputCls} placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} />
              <input required type="email" className={inputCls} placeholder="Email (login ID)" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              <input required type="password" className={inputCls} placeholder="Initial Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select className={inputCls} value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="Assignee">Assignee</option>
                <option value="Admin">Admin</option>
              </select>
              <select className={inputCls} value={newGroup} onChange={e => setNewGroup(e.target.value)}>
                <option value="Office Staff">Office Staff</option>
                <option value="Institution">Institution</option>
              </select>
              <input className={inputCls} placeholder="Department" value={newDept} onChange={e => setNewDept(e.target.value)} />
              <input className={inputCls} placeholder="Manager (optional)" value={newManager} onChange={e => setNewManager(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 mt-2 border-t border-surface-container pt-4">
              <button type="button" className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" onClick={() => setIsOpen(false)}>Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm font-bold bg-primary text-white hover:opacity-90 active:scale-95 rounded-lg shadow-sm transition-all" disabled={loading}>{loading ? 'Saving...' : 'Save User'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Password Reset Modal */}
      {resettingId && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-outline-variant/30 w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-surface-container pb-3">
               <span className="material-symbols-outlined text-error">lock_reset</span>
               <h3 className="font-bold text-lg font-headline text-on-surface">Reset User Password</h3>
            </div>
            {resetError && <p className="text-error text-sm font-bold bg-error-container/50 px-3 py-2 rounded">{resetError}</p>}
            <p className="text-sm text-on-surface-variant">Enter a new password for this user. They will be logged out of all active sessions.</p>
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4 mt-2">
              <input type="password" required className={inputCls} placeholder="New Password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" onClick={() => {setResettingId(null); setResetError(null); setResetPassword('');}}>Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-error text-white hover:opacity-90 rounded-lg shadow-sm transition-opacity" disabled={resetLoading}>{resetLoading ? 'Updating...' : 'Force Password Reset'}</button>
              </div>
            </form>
          </div>
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
                  {editingId === p.id ? (
                    <>
                      <td className="px-5 py-3"><input className={inputCls} value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /></td>
                      <td className="px-5 py-3">
                        <input className={inputCls} type="email" value={editData.newEmail} onChange={e => setEditData({...editData, newEmail: e.target.value})} placeholder={editData.email || 'new@email.com'} />
                        <p className="text-[10px] text-on-surface-variant mt-0.5">Current: {editData.email || '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <select className={inputCls} value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                          <option value="Assignee">Assignee</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <select className={inputCls} value={editData.staff_group} onChange={e => setEditData({...editData, staff_group: e.target.value})}>
                          <option value="Office Staff">Office Staff</option>
                          <option value="Institution">Institution</option>
                        </select>
                      </td>
                      <td className="px-5 py-3"><input className={inputCls} value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})} /></td>
                      <td className="px-5 py-3"><input className={inputCls} value={editData.manager} onChange={e => setEditData({...editData, manager: e.target.value})} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 shadow-sm" onClick={saveEdit} disabled={editLoading}>
                            {editLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button className="bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-container-high" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-4">
                         <div className="flex items-center gap-3">
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30" />
                              : <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-[10px] font-bold text-on-surface">{getAvatarInitials(p.name)}</div>
                            }
                            <span className="font-semibold text-on-surface">{p.name}</span>
                         </div>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant font-mono text-xs">{p.email || '—'}</td>
                      <td className="px-5 py-4 text-center">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${p.role === 'Admin' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.role}</span>
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-on-surface-variant text-xs">{p.staff_group}</td>
                      <td className="px-5 py-4 text-on-surface-variant font-medium text-xs">{p.department || '—'}</td>
                      <td className="px-5 py-4 text-on-surface-variant font-medium text-xs">{p.manager || '—'}</td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low px-3 py-1.5 rounded-lg" onClick={() => startEdit(p)}>Edit</button>
                        <button className="text-xs font-bold text-error hover:text-white hover:bg-error transition-colors border border-error/30 bg-error/5 px-3 py-1.5 rounded-lg" onClick={() => setResettingId(p.id)}>Reset PW</button>
                      </td>
                    </>
                  )}
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
    </div>
  );
}
