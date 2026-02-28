import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const STACK = [
  { label: 'Runtime', value: 'Node.js + Express' },
  { label: 'Database', value: 'SQLite (better-sqlite3)' },
  { label: 'Auth', value: 'JWT + bcrypt' },
  { label: 'Frontend', value: 'React + Vite' },
  { label: 'Styling', value: 'Tailwind CSS' },
];

export default function About() {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.getInfo().then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">About TimeKeep</h1>

      <div className="bg-slate-700 rounded-xl border border-slate-600 p-6 mb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-3xl font-bold text-emerald-400">TimeKeep</span>
          {info && (
            <span className="text-sm font-mono text-slate-400">v{info.version}</span>
          )}
        </div>
        <p className="text-slate-400 text-sm">A simple semi-monthly time tracking application.</p>
      </div>

      <div className="bg-slate-700 rounded-xl border border-slate-600 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Tech Stack</h2>
        <dl className="space-y-2">
          {STACK.map(({ label, value }) => (
            <div key={label} className="flex gap-4">
              <dt className="text-slate-400 text-sm w-24 shrink-0">{label}</dt>
              <dd className="text-white text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-slate-700 rounded-xl border border-slate-600 p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Logged In As</h2>
        <dl className="space-y-2">
          <div className="flex gap-4">
            <dt className="text-slate-400 text-sm w-24 shrink-0">Name</dt>
            <dd className="text-white text-sm">{user?.display_name}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-slate-400 text-sm w-24 shrink-0">Username</dt>
            <dd className="text-white text-sm font-mono">{user?.username}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-slate-400 text-sm w-24 shrink-0">Role</dt>
            <dd className="text-sm">
              {user?.is_admin
                ? <span className="text-emerald-400 font-medium">Administrator</span>
                : <span className="text-slate-300">User</span>
              }
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
