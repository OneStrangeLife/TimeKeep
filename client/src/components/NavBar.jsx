import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const link = (to, label) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-emerald-500 text-white'
          : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-slate-800 border-b border-slate-700 text-white px-4 py-2 flex items-center gap-4">
      <span className="font-bold text-lg mr-4 text-emerald-400">TimeKeep</span>
      {link('/', 'Dashboard')}
      {link('/setup', 'Setup')}
      {link('/reports', 'Reports')}
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="text-slate-400">{user?.display_name}</span>
        <button
          onClick={logout}
          className="bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
