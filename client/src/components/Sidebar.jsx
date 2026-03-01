import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const isMaintenancePath = (path) => path === '/setup' || path.startsWith('/admin/edit-time');

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [version, setVersion] = useState(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState(() => isMaintenancePath(pathname));

  useEffect(() => {
    api.getInfo().then(d => setVersion(d.version)).catch(() => {});
  }, []);

  // Keep Maintenance expanded when navigating to a maintenance route
  useEffect(() => {
    if (isMaintenancePath(pathname)) setMaintenanceOpen(true);
  }, [pathname]);

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-emerald-500 text-white'
          : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
    </Link>
  );

  const subNavLink = (to, label) => (
    <Link
      to={to}
      className={`flex items-center pl-6 pr-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <aside className="w-52 bg-slate-900 border-r border-slate-700 flex flex-col min-h-screen shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <span className="text-xl font-bold text-emerald-400">TimeKeep</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navLink('/', 'Dashboard')}
        <div>
          <button
            type="button"
            onClick={() => setMaintenanceOpen(o => !o)}
            className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isMaintenancePath(pathname)
                ? 'bg-slate-700 text-emerald-400'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>Maintenance</span>
            <span className="text-slate-500 text-xs transition-transform" style={{ transform: maintenanceOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
          </button>
          {maintenanceOpen && (
            <div className="mt-0.5 space-y-0.5">
              {subNavLink('/setup', 'Setup')}
              {user?.is_admin && subNavLink('/admin/edit-time', 'Edit User Time')}
            </div>
          )}
        </div>
        {navLink('/reports', 'Reports')}
        {navLink('/links', 'Links')}
        {navLink('/scripts', 'Scripts')}
        <div className="border-t border-slate-700/60 my-2" />
        {navLink('/about', 'About')}
      </nav>
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-1 truncate">{user?.display_name}</p>
        {version && <p className="text-xs text-slate-600 mb-2">v{version}</p>}
        <button
          onClick={logout}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-1.5 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
