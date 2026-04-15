import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function AppLayout({ userRole, staffGroup, setStaffGroup, currentUser }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const adminNav = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Work Pipeline', path: '/tasks', icon: 'assignment' },
    { label: 'Projects', path: '/projects-events', icon: 'folder_open' },
    { label: 'Planning Pool', path: '/planning', icon: 'account_tree' },
    { label: 'Staff Overview', path: '/staff', icon: 'group' },
    { label: 'Reports', path: '/reports', icon: 'analytics' },
    { label: 'Manage Staff', path: '/users', icon: 'manage_accounts' }
  ];

  const assigneeNav = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Tasks', path: 'tasks', icon: 'assignment' },
    { label: 'Projects', path: 'projects', icon: 'layers' },
    { label: 'Planning Pool', path: 'planning', icon: 'group_work' },
    { label: 'Reports', path: 'reports', icon: 'analytics' }
  ];

  const navItems = userRole === 'Admin' ? adminNav : assigneeNav;

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-background text-on-surface min-h-screen selection:bg-primary/10">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md h-16 flex justify-between items-center px-4 md:px-8 border-b border-outline shadow-sm">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-on-surface font-headline">WorkPulse ERP</span>
        </div>
        
        {userRole === 'Admin' && (
          <div className="hidden md:flex bg-background p-1 rounded-lg border border-outline absolute left-1/2 -translate-x-1/2">
            <button 
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${staffGroup === 'Office Staff' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => setStaffGroup('Office Staff')}
            >
              Office Staff
            </button>
            <button 
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${staffGroup === 'Institution' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => setStaffGroup('Institution')}
            >
              Institution
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-xs hidden md:block group">
             <input className="w-full bg-background/50 border border-outline rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Search tasks or staff..." type="text"/>
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
          </div>

          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">notifications</button>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-8 w-8 rounded-full bg-primary-container text-primary font-bold text-sm flex items-center justify-center border border-outline hover:ring-2 hover:ring-primary transition-all"
            >
              {getAvatarInitials(currentUser?.name)}
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-outline py-2 z-50">
                <div className="px-4 py-2 border-b border-outline mb-2">
                  <p className="text-sm font-bold text-on-surface">{currentUser?.name}</p>
                  <p className="text-xs text-on-surface-variant">{currentUser?.role}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-dim transition-colors flex items-center gap-2">
                   <span className="material-symbols-outlined text-[18px]">person</span> Profile
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)] pt-16">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col h-[calc(100vh-64px)] w-64 fixed left-0 top-16 bg-white border-r border-outline py-6 z-40">
           <div className="px-6 mb-8">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>shield_with_heart</span>
               </div>
               <div>
                  <h2 className="font-headline font-bold text-on-surface leading-none truncate">
                    {userRole === 'Admin' ? 'Executive Ops' : 'Assignee Portal'}
                  </h2>
                  <span className="text-[10px] text-on-surface-variant font-body uppercase tracking-widest">Workspace</span>
               </div>
             </div>
           </div>

           <nav className="flex-1 flex flex-col font-body text-sm space-y-1 px-3 overflow-y-auto">
             {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium ${
                      isActive 
                        ? 'bg-primary/10 text-primary border-l-4 border-primary font-bold' 
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`
                  }
                >
                  <span className={`material-symbols-outlined text-xl ${userRole === 'Admin' ? '' : ''}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
             ))}
           </nav>

           <div className="px-6 mt-auto border-t border-outline/30 pt-4">
              <button className="w-full py-2 bg-primary text-white font-bold rounded-md shadow-md hover:opacity-90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                 <span className="material-symbols-outlined text-lg">add</span>
                 Create New
              </button>
           </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto bg-surface architectural-grid">
           <Outlet />
        </main>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-outline flex justify-around py-3 px-2 z-50 pb-safe">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
