import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LoginPage } from './pages/LoginPage';
import { InitialSetupPage } from './pages/InitialSetupPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveScannerPage } from './pages/LiveScannerPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentRegistrationPage } from './pages/StudentRegistrationPage';
import { AttendancePage } from './pages/AttendancePage';
import { SessionsPage } from './pages/SessionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';

const AppRouter: React.FC = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#/login');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/login');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Determine route component
  const path = currentHash.split('?')[0];

  if (path === '#/setup') {
    return <InitialSetupPage />;
  }

  if (path === '#/login') {
    return <LoginPage />;
  }

  if (path === '#/dashboard') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  if (path === '#/scanner') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <LiveScannerPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/students') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <StudentsPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/register-student') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <StudentRegistrationPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/attendance') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AttendancePage />
      </ProtectedRoute>
    );
  }

  if (path === '#/sessions') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <SessionsPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/analytics') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AnalyticsPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/audit-logs') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AuditLogsPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/settings') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <SettingsPage />
      </ProtectedRoute>
    );
  }

  if (path === '#/student') {
    return (
      <ProtectedRoute allowedRole="STUDENT">
        <StudentDashboardPage />
      </ProtectedRoute>
    );
  }

  // Fallback redirection
  if (!loading) {
    if (isAuthenticated) {
      if (isAdmin) {
        window.location.hash = '#/dashboard';
      } else {
        window.location.hash = '#/student';
      }
    } else {
      window.location.hash = '#/login';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
