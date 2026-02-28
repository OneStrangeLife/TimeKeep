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
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    api.getInfo().then(setInfo).catch(() => {});
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.new_password !== pw.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    try {
      await api.changePassword(user.id, {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      setPw({ current_password: '', new_password: '', confirm: '' });
      setPwMsg({ type: 'success', text: 'Password updated successfully' });
    } catch (e) {
      setPwMsg({ type: 'error', text: e.message });
    }
  }

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

      <div className="bg-slate-700 rounded-xl border border-slate-600 p-6 mb-4">
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

      <div className="bg-slate-700 rounded-xl border border-slate-600 p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-xs">
          {!user?.is_admin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Current Password</label>
              <input
                type="password"
                className="border border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={pw.current_password}
                onChange={e => setPw(p => ({ ...p, current_password: e.target.value }))}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">New Password</label>
            <input
              type="password"
              className="border border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={pw.new_password}
              onChange={e => setPw(p => ({ ...p, new_password: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Confirm New Password</label>
            <input
              type="password"
              className="border border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              required
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            className="bg-emerald-500 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
