import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './auth';
import AppLayout from './layout/AppLayout';
import AskPage from './pages/Ask';
import DashboardPage from './pages/Dashboard';
import DocDetailPage from './pages/DocDetail';
import LoginPage from './pages/Login';
import NotFoundPage from './pages/NotFound';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="docs/:id" element={<DocDetailPage />} />
            <Route path="ask" element={<AskPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
