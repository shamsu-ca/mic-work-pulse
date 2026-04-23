import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDataContext } from '../../context/SupabaseDataContext';
import { supabase } from '../../lib/supabaseClient';
import ProfileModal from '../common/ProfileModal';
import CreateItemModal from '../common/CreateItemModal';

export default function AppLayout({ userRole, currentUser }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();
  const { getActiveAnnouncements } = useDataContext();
  const unreadCount = (getActiveAnnouncements?.() || []).length;

  const adminNav = [
    { label: 'Dashboard',  path: '/',               icon: 'dashboard' },
    { label: 'Staffs',     path: '/staff',           icon: 'group' },
    { label: 'Works',      path: '/tasks',           icon: 'assignment' },
    { label: 'Planning',   path: '/planning',        icon: 'account_tree' },
    { label: 'Works Hub',  path: '/projects-events', icon: 'hub' },
    { label: 'Reports',    path: '/reports',         icon: 'analytics' },
  ];

  const assigneeNav = [
    { label: 'Dashboard',     path: '/',        icon: 'dashboard' },
    { label: 'Works',         path: '/tasks',   icon: 'assignment' },
    { label: 'Planning',      path: '/planning',icon: 'account_tree' },
    { label: 'Reports',       path: '/reports', icon: 'analytics' },
  ];

  const managerNav = [
    { label: 'Dashboard',     path: '/',         icon: 'dashboard' },
    { label: 'Works',         path: '/tasks',    icon: 'assignment' },
    { label: 'Planning',      path: '/planning', icon: 'account_tree' },
    { label: 'Reports',       path: '/reports',  icon: 'analytics' },
    { label: 'My Team',       path: '/my-team',  icon: 'supervised_user_circle' },
  ];

  const navItems = userRole === 'Admin' ? adminNav
    : userRole === 'Manager' ? managerNav
    : assigneeNav;

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    return split.length > 1 ? (split[0][0] + split[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-background text-on-surface min-h-screen selection:bg-primary/10">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md h-14 flex justify-between items-center px-4 md:px-6 border-b border-outline-variant/50">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
          </div>
          <span className="text-base font-extrabold tracking-tight text-on-surface font-headline">MIC WorkPulse</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block group">
            <input className="bg-surface-container-low border border-outline-variant/40 rounded-full py-1.5 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-52 focus:w-64" placeholder="Search…" type="text" />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[17px]">search</span>
          </div>


          <button onClick={() => navigate('/notifications')} className="relative w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border-2 border-primary/20 hover:border-primary/60 transition-all"
            >
              {currentUser?.avatar_url
                ? <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : getAvatarInitials(currentUser?.name)
              }
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-outline-variant/30 py-2 z-50">
                <div className="px-4 py-2.5 border-b border-surface-container mb-1">
                  <p className="text-sm font-bold text-on-surface">{currentUser?.name}</p>
                  <p className="text-xs text-on-surface-variant">{currentUser?.role}</p>
                </div>
                <button
                  onClick={() => { setIsProfileOpen(false); setIsProfileModalOpen(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2.5"
                >
                  <span className="material-symbols-outlined text-[17px] text-on-surface-variant">manage_accounts</span> My Profile
                </button>
                <button
                  onClick={() => { setIsProfileOpen(false); supabase.auth.signOut(); }}
                  className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/30 transition-colors flex items-center gap-2.5"
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)] pt-14">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col h-[calc(100vh-56px)] w-60 fixed left-0 top-14 bg-white border-r border-outline-variant/40 py-5 z-40">
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-surface-container-low">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-headline font-bold text-on-surface text-sm leading-none truncate">
                  {userRole === 'Admin' ? 'MIC WorkPulse' : 'My Workspace'}
                </h2>
                <span className="text-[9px] text-on-surface-variant font-body uppercase tracking-widest">{userRole}</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 flex flex-col font-body text-sm space-y-0.5 px-3 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 mt-auto border-t border-outline-variant/30 pt-4">
            <button onClick={() => setIsCreateOpen(true)} className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-sm shadow-primary/30">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create New
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-60 p-4 md:p-6 overflow-y-auto bg-surface architectural-grid">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-outline-variant/40 z-50">
        <div className="flex items-center py-1 px-1">
          <div className="flex flex-1 justify-around">
            {navItems.slice(0, Math.floor(navItems.length / 2)).map((item) => (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                    <span className="text-[8px] font-bold leading-none text-center">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-12 h-12 -mt-5 mx-1 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center text-white active:scale-95 transition-all border-4 border-white flex-shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>
          <div className="flex flex-1 justify-around">
            {navItems.slice(Math.floor(navItems.length / 2)).map((item) => (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                    <span className="text-[8px] font-bold leading-none text-center">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="h-safe-bottom bg-white"></div>
      </nav>

      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} currentUser={currentUser} />
      )}
      {isCreateOpen && (
        <CreateItemModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
}
