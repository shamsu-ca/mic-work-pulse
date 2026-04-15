import React from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import AssigneeDashboard from '../components/dashboard/AssigneeDashboard';

export default function DashboardPage() {
  const { currentUser } = useDataContext();

  if (currentUser.role === 'Assignee') {
    return <AssigneeDashboard />;
  }

  return <AdminDashboard />;
}
