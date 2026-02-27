import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const link = (to, label) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded text-sm font-medium ${
        pathname === to
          ? 'bg-blue-700 text-white'
          : 'text-blue-100 hover:bg-blue-600'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-blue-800 text-white px-4 py-2 flex items-center gap-4">
      <span className="font-bold text-lg mr-4">TimeKeep</span>
      {link('/', 'Dashboard')}
      {link('/setup', 'Setup')}
      {link('/reports', 'Reports')}
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="text-blue-200">{user?.display_name}</span>
        <button
          onClick={logout}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
