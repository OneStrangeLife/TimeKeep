import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Setup from './pages/Setup.jsx';
import Reports from './pages/Reports.jsx';
import About from './pages/About.jsx';
import Links from './pages/Links.jsx';
import Scripts from './pages/Scripts.jsx';
import TeleprompterPopup from './pages/TeleprompterPopup.jsx';
import AdminEditTime from './pages/AdminEditTime.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isTeleprompter = pathname.startsWith('/teleprompter/');

  return (
    <div className="flex min-h-screen bg-slate-800">
      {user && !isTeleprompter && <Sidebar />}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/setup" element={<RequireAuth><Setup /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
          <Route path="/links" element={<RequireAuth><Links /></RequireAuth>} />
          <Route path="/scripts" element={<RequireAuth><Scripts /></RequireAuth>} />
          <Route path="/admin/edit-time" element={<RequireAdmin><AdminEditTime /></RequireAdmin>} />
          <Route path="/teleprompter/:id" element={<RequireAuth><TeleprompterPopup /></RequireAuth>} />
          <Route path="/about" element={<RequireAuth><About /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
