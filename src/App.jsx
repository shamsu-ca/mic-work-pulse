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

function AppContent() {
  const { currentUser, loadingInitial } = useDataContext();

  if (loadingInitial || !currentUser) {
    return <div className="h-screen w-full flex items-center justify-center font-bold text-on-surface-variant font-headline">Loading application data...</div>;
  }

  const role = currentUser?.role || 'Assignee';

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout userRole={role} currentUser={currentUser} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<AllTasksPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/projects-events" element={<ProjectsEventsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {role === 'Admin' && (
            <Route path="/staff" element={<StaffOverviewPage />} />
          )}
          {role !== 'Admin' && (
            <Route path="/staff" element={<Navigate to="/" replace />} />
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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
