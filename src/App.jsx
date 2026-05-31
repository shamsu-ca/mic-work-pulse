import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseDataProvider, useDataContext } from './context/SupabaseDataContext';
import { supabase } from './lib/supabaseClient';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StaffOverviewPage from './pages/StaffOverviewPage';
import AllTasksPage from './pages/AllTasksPage';
import PlanningPage from './pages/PlanningPage';
import ProjectsEventsPage from './pages/ProjectsEventsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import MyLeavePage from './pages/MyLeavePage';

function AppContent() {
  const { currentUser, loadingInitial } = useDataContext();
  const role = currentUser?.role || 'Assignee';

  return (
    <BrowserRouter>
      {(loadingInitial || !currentUser) ? (
        <div className="h-screen w-full flex items-center justify-center font-bold text-on-surface-variant font-headline">Loading application data...</div>
      ) : (
        <Routes>
          <Route element={<AppLayout userRole={role} currentUser={currentUser} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<AllTasksPage />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/projects-events" element={<ProjectsEventsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            <Route path="/leave" element={<MyLeavePage />} />

            {role === 'Admin' && (
              <Route path="/staff" element={<StaffOverviewPage />} />
            )}
            {role !== 'Admin' && (
              <Route path="/staff" element={<Navigate to="/" replace />} />
            )}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      const saved = localStorage.getItem('workpulse_session');
      setSession(saved ? JSON.parse(saved) : null);
      setIsSessionLoading(false);
    };

    checkSession();

    window.addEventListener('storage', checkSession);
    window.addEventListener('workpulse_auth_change', checkSession);

    return () => {
      window.removeEventListener('storage', checkSession);
      window.removeEventListener('workpulse_auth_change', checkSession);
    };
  }, []);

  if (isSessionLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Verifying authentication...</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <SupabaseDataProvider session={session}>
      <AppContent />
    </SupabaseDataProvider>
  );
}
