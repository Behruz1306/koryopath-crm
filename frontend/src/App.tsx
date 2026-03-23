import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from './store';
import { useKeyboardShortcuts } from './hooks';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const Dashboard = React.lazy(() => import('./pages/DashboardPage'));
const StudentList = React.lazy(() => import('./pages/StudentListPage'));
const StudentForm = React.lazy(() => import('./pages/StudentFormPage'));
const StudentCard = React.lazy(() => import('./pages/StudentCardPage'));
const UniversityList = React.lazy(() => import('./pages/UniversityListPage'));
const UniversityDetail = React.lazy(() => import('./pages/UniversityDetailPage'));
const TaskList = React.lazy(() => import('./pages/TaskListPage'));
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsPage'));
const PenaltyList = React.lazy(() => import('./pages/PenaltyListPage'));
const TeamPage = React.lazy(() => import('./pages/TeamPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const Layout = React.lazy(() => import('./components/layout/Layout'));

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Koryo<span className="text-primary-600 dark:text-primary-400">Path</span>
        </span>
      </div>
    </div>
  );
}

function BossRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== 'boss') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AuthenticatedApp() {
  useKeyboardShortcuts();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/new" element={<StudentForm />} />
          <Route path="/students/:id" element={<StudentCard />} />
          <Route path="/students/:id/edit" element={<StudentForm />} />
          <Route path="/universities" element={<UniversityList />} />
          <Route path="/universities/:id" element={<UniversityDetail />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route
            path="/analytics"
            element={
              <BossRoute>
                <AnalyticsDashboard />
              </BossRoute>
            }
          />
          <Route path="/penalties" element={<PenaltyList />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Suspense>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, refreshUser } = useAuthStore();
  const setDarkMode = useUIStore((state) => state.setDarkMode);

  useEffect(() => {
    const token = localStorage.getItem('koryopath_session_token');
    if (token) {
      refreshUser();
    }
  }, [refreshUser]);

  useEffect(() => {
    const stored = localStorage.getItem('koryopath_dark_mode');
    if (stored === 'true') {
      setDarkMode(true);
    }
  }, [setDarkMode]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {isAuthenticated ? <AuthenticatedApp /> : <LoginPage />}
    </Suspense>
  );
}
