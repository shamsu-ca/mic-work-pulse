import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../context/SupabaseDataContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import AssigneeDashboard from '../components/dashboard/AssigneeDashboard';

export default function DashboardPage() {
  const { currentUser, getActiveAnnouncements, getDynamicNotificationText, profiles } = useDataContext();
  const navigate = useNavigate();
  
  const noticesRaw = getActiveAnnouncements?.() || [];
  let notices = noticesRaw.filter(a => a.staff_group === 'Both' || a.staff_group === currentUser?.category || currentUser?.role === 'Admin');

  // Sorting
  notices.sort((a, b) => {
    const isTodayA = a.type === 'Program' && getDynamicNotificationText(a) === 'Today';
    const isTodayB = b.type === 'Program' && getDynamicNotificationText(b) === 'Today';
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;

    const creatorA = profiles?.find(p => p.id === a.created_by);
    const creatorB = profiles?.find(p => p.id === b.created_by);
    const isAdminA = creatorA?.role === 'Admin';
    const isAdminB = creatorB?.role === 'Admin';

    if (isAdminA && !isAdminB) return -1;
    if (!isAdminA && isAdminB) return 1;

    if (isAdminA && isAdminB) {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
    }
    
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const displayNotices = notices.slice(0, 3);
  const hasMore = notices.length > 3;

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {displayNotices.length > 0 && (
        <div className="flex flex-col gap-2 animate-fade-in mb-2 mt-[-1rem]">
          {displayNotices.map(notice => (
            <div key={notice.id} className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-xl shadow-sm flex items-center gap-3">
               <span className="material-symbols-outlined text-primary">{notice.type === 'Text' ? 'campaign' : 'event'}</span>
               <span className="text-sm font-bold text-on-surface">
                 {getDynamicNotificationText(notice) && (
                   <span className="text-primary mr-1.5">{getDynamicNotificationText(notice)}</span> 
                 )}
                 {notice.type === 'Text' ? notice.message : notice.title}
               </span>
            </div>
          ))}
          {hasMore && (
            <button 
              onClick={() => navigate('/planning', { state: { activeTab: 'Notifications' } })}
              className="text-xs font-bold text-primary hover:underline text-left pl-2"
            >
              View {notices.length - 3} more {notices.length - 3 === 1 ? 'announcement' : 'announcements'}...
            </button>
          )}
        </div>
      )}
      
      {currentUser.role === 'Assignee' ? <AssigneeDashboard /> : <AdminDashboard />}
    </div>
  );
}
