import React from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import AssigneeDashboard from '../components/dashboard/AssigneeDashboard';

export default function DashboardPage() {
  const { currentUser, getActiveAnnouncements, getDynamicNotificationText } = useDataContext();
  
  const noticesRaw = getActiveAnnouncements?.() || [];
  const notices = noticesRaw.filter(a => a.staff_group === 'Both' || a.staff_group === currentUser?.category || currentUser?.role === 'Admin');

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {notices.length > 0 && (
        <div className="flex flex-col gap-2 animate-fade-in mb-2 mt-[-1rem]">
          {notices.map(notice => (
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
        </div>
      )}
      
      {currentUser.role === 'Assignee' ? <AssigneeDashboard /> : <AdminDashboard />}
    </div>
  );
}
