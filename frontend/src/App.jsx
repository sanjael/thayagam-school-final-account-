import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ClassesPage from './pages/ClassesPage';
import ClassDetailsPage from './pages/ClassDetailsPage';
import FeesPage from './pages/FeesPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UserManagementPage from './pages/UserManagementPage';
import VanFeesPage from './pages/VanFeesPage';
import { useAuth } from './AuthContext';

function ProtectedRoute({ element, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return element;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public — login only */}
      <Route path="/login" element={user && !user.mustChangePassword ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      {/* Force password change */}
      <Route path="/change-password" element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute element={<DashboardPage />} />} />
      <Route path="/students"  element={<ProtectedRoute element={<StudentsPage />} />} />
      <Route path="/classes"   element={<ProtectedRoute element={<ClassesPage />} />} />
      <Route path="/classes/:id" element={<ProtectedRoute element={<ClassDetailsPage />} />} />
      <Route path="/fees"      element={<ProtectedRoute element={<FeesPage />} roles={['admin']} />} />
      <Route path="/payments"  element={<ProtectedRoute element={<PaymentsPage />} roles={['admin', 'accountant']} />} />
      <Route path="/reports"   element={<ProtectedRoute element={<ReportsPage />} />} />
      <Route path="/van-fees"  element={<ProtectedRoute element={<VanFeesPage />} roles={['admin', 'accountant']} />} />
      <Route path="/settings"  element={<ProtectedRoute element={<SettingsPage />} roles={['admin']} />} />
      <Route path="/audit-logs" element={<ProtectedRoute element={<AuditLogsPage />} roles={['admin']} />} />
      <Route path="/admin/users" element={<ProtectedRoute element={<UserManagementPage />} roles={['admin']} />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
