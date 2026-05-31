import React, { useState, useRef } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';
import { supabase } from '../../lib/supabaseClient';

export default function ProfileModal({ onClose, currentUser }) {
  const { updateProfile } = useDataContext();

  const [name, setName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [notifSettings, setNotifSettings] = useState(currentUser?.notification_settings || {
    popup_enabled: false, sound_enabled: true, notify_tasks: true, notify_overdue: true, notify_announcements: true, notify_programs: true
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [pwError, setPwError] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const fileRef = useRef();

  const [permStatus, setPermStatus] = useState('Notification' in window ? Notification.permission : 'Not Supported');

  // Capture PWA install event
  React.useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      alert("To install: open your browser menu and tap 'Add to Home Screen' or 'Install App'.");
    }
  };

  const handleTogglePopup = async () => {
    if (!('Notification' in window)) return;
    if (!notifSettings.popup_enabled) {
      // Prompt for permission if enabling
      const perm = await Notification.requestPermission();
      setPermStatus(perm);
      if (perm === 'granted') {
        setNotifSettings({ ...notifSettings, popup_enabled: true });
      } else {
        alert('Notifications were denied by your browser. Please allow them in your site settings.');
      }
    } else {
      setNotifSettings({ ...notifSettings, popup_enabled: false });
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const { error } = await updateProfile(currentUser.id, { name, avatar_url: avatarUrl, notification_settings: notifSettings });
    if (error) setError(error.message);
    else setMessage('Profile updated successfully!');
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    if (newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setPwLoading(true);
    const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', currentUser.id);
    if (error) setPwError(error.message);
    else { setMessage('Password changed successfully!'); setNewPassword(''); setConfirmPassword(''); }
    setPwLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgLoading(true);
    const ext = file.name.split('.').pop();
    const filePath = `avatars/${currentUser.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { setError('Upload failed: ' + uploadError.message); setImgLoading(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setImgLoading(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">manage_accounts</span>
            <h2 className="font-bold text-lg text-on-surface font-headline">My Profile</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">

          {message && <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-xl text-sm font-semibold flex gap-2 items-center"><span className="material-symbols-outlined text-[18px]">check_circle</span>{message}</div>}

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
                  {getInitials(currentUser?.name)}
                </div>
              )}
              <button 
                onClick={() => fileRef.current.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full border-2 border-white flex items-center justify-center text-white shadow hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            {imgLoading && <p className="text-xs text-primary font-semibold">Uploading image...</p>}
            <div className="text-center">
              <p className="text-sm font-bold text-on-surface">{currentUser?.name}</p>
              <p className="text-xs text-on-surface-variant">{currentUser?.role}</p>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <p className="text-xs font-black text-on-surface-variant uppercase tracking-wider border-b border-surface-container pb-2">Update Profile</p>
            {error && <p className="text-red-600 text-xs font-semibold bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Display Name</label>
              <input
                className="bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="bg-primary text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px]">save</span>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Notification Settings */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <p className="text-xs font-black text-on-surface-variant uppercase tracking-wider">Notification Settings</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${permStatus === 'granted' ? 'bg-green-100 text-green-700' : permStatus === 'denied' ? 'bg-red-100 text-red-700' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {permStatus === 'granted' ? 'Allowed' : permStatus === 'denied' ? 'Blocked' : permStatus}
              </span>
            </div>
            
            <div className="flex flex-col gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${notifSettings.popup_enabled ? 'text-primary' : 'text-on-surface-variant'}`}>{notifSettings.popup_enabled ? 'notifications_active' : 'notifications_off'}</span>
                  <span className="text-sm font-bold text-on-surface">Enable Popups</span>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${notifSettings.popup_enabled ? 'bg-primary' : 'bg-surface-container-high'}`} onClick={handleTogglePopup}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.popup_enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${notifSettings.sound_enabled ? 'text-primary' : 'text-on-surface-variant'}`}>{notifSettings.sound_enabled ? 'volume_up' : 'volume_off'}</span>
                  <span className="text-sm font-bold text-on-surface">Enable Sound</span>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${notifSettings.sound_enabled ? 'bg-primary' : 'bg-surface-container-high'}`} onClick={() => setNotifSettings({...notifSettings, sound_enabled: !notifSettings.sound_enabled})}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.sound_enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </label>

              <div className="h-px bg-surface-container w-full"></div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={notifSettings.notify_tasks} onChange={e => setNotifSettings({...notifSettings, notify_tasks: e.target.checked})} />
                  <span className="text-xs font-semibold text-on-surface">Tasks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={notifSettings.notify_overdue} onChange={e => setNotifSettings({...notifSettings, notify_overdue: e.target.checked})} />
                  <span className="text-xs font-semibold text-on-surface">Overdue Alerts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={notifSettings.notify_announcements} onChange={e => setNotifSettings({...notifSettings, notify_announcements: e.target.checked})} />
                  <span className="text-xs font-semibold text-on-surface">Announcements</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={notifSettings.notify_programs} onChange={e => setNotifSettings({...notifSettings, notify_programs: e.target.checked})} />
                  <span className="text-xs font-semibold text-on-surface">Programs/Events</span>
                </label>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={loading} className="bg-surface-container-low text-primary border border-primary/20 font-bold py-2 rounded-xl text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Notification Settings
            </button>
          </div>

          {/* Password Form */}
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <p className="text-xs font-black text-on-surface-variant uppercase tracking-wider border-b border-surface-container pb-2">Change Password</p>
            {pwError && <p className="text-red-600 text-xs font-semibold bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">New Password</label>
              <input type="password" className="bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Confirm Password</label>
              <input type="password" className="bg-slate-50 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={pwLoading} className="bg-on-surface text-surface font-bold py-2.5 rounded-xl text-sm hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              {pwLoading ? 'Updating...' : 'Change Password'}
            </button>
          </form>

          {/* PWA Install */}
          <div className="border-t border-surface-container pt-4">
            <button
              onClick={handleInstallPWA}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-semibold text-on-surface"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">add_to_home_screen</span>
              <div className="text-left">
                <p className="font-bold text-sm">Add to Home Screen</p>
                <p className="text-xs text-on-surface-variant font-medium">Install MIC WorkPulse as a PWA</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
