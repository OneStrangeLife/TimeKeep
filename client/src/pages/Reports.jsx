import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function fmtH(h) {
  return typeof h === 'number' ? h.toFixed(2) : '0.00';
}

export default function Reports() {
  const { user } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + '01';

  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(today);
  const [clientId, setClientId] = useState('');
  const [userId, setUserId] = useState('');
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getClients().then(setClients).catch(e => setError(e.message));
    if (user.is_admin) api.getUsers().then(setUsers).catch(() => {});
  }, []);

  async function runReport() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSummary(buildParams());
      setSummary(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildParams() {
    const p = { start, end };
    if (clientId) p.client_id = clientId;
    if (user.is_admin && userId) p.user_id = userId;
    return p;
  }

  const inputCls = 'border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Reports</h1>

      {/* Filters */}
      <div className="bg-slate-700 rounded-xl shadow border border-slate-600 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Start date</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">End date</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}>
              <option value="">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {user.is_admin && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">User</label>
              <select value={userId} onChange={e => setUserId(e.target.value)} className={inputCls}>
                <option value="">All users</option>
                {users.filter(u => u.active).map(u => (
                  <option key={u.id} value={u.id}>{u.display_name}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={runReport} disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
            {loading ? 'Running…' : 'Run Report'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 mb-3 text-sm">{error}</p>}

      {/* Summary table */}
      {summary && (
        <div className="bg-slate-700 rounded-xl shadow border border-slate-600 p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3 text-white">Summary</h2>
          {summary.summary.length === 0 ? (
            <p className="text-slate-400 text-sm">No entries found for this period.</p>
          ) : (
            <div className="space-y-4">
              {summary.summary.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between font-semibold text-white border-b border-slate-600 pb-1">
                    <span>{c.name}</span>
                    <span className="font-mono text-emerald-400">
                      {fmtH(c.total_hours)} h
                      {c.total_sales > 0 ? ` · ${c.total_sales} sales` : ''}
                    </span>
                  </div>
                  <ul className="pl-4 mt-1 space-y-0.5">
                    {c.projects.map((p, j) => (
                      <li key={j} className="flex justify-between text-sm text-slate-400">
                        <span>{p.name}</span>
                        <span className="font-mono">
                          {fmtH(p.hours)} h
                          {p.sales > 0 ? ` · ${p.sales} sales` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="flex justify-between font-bold text-white border-t border-slate-600 pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-emerald-400">
                  {fmtH(summary.grand_total_hours)} h
                  {summary.grand_total_sales > 0 ? ` · ${summary.grand_total_sales} sales` : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export buttons */}
      <div className="flex gap-3 flex-wrap">
        <a
          href={api.exportCsvUrl(buildParams())}
          target="_blank"
          rel="noreferrer"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Download CSV
        </a>
        <a
          href={api.exportExcelUrl(buildParams())}
          target="_blank"
          rel="noreferrer"
          className="bg-teal-600 hover:bg-teal-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Download Excel
        </a>
        <a
          href={api.exportPrintUrl(buildParams())}
          target="_blank"
          rel="noreferrer"
          className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Print View
        </a>
      </div>
    </div>
  );
}
