import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import TimeRow from '../components/TimeRow.jsx';
import ClientSummary from '../components/ClientSummary.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

let nextTempId = -1;
function newBlankEntry(date) {
  const id = nextTempId--;
  return {
    id,
    _key: id,
    client_id: '',
    project_id: '',
    entry_date: date,
    start_time: '',
    stop_time: '',
    sales_count: '',
    duration_hours: null,
    notes: '',
    _isNew: true,
  };
}

export default function AdminEditTime() {
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [payPeriod, setPayPeriod] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    api.getPayPeriodForDate(date).then(setPayPeriod).catch(() => setPayPeriod(null));
  }, [date]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setClients([]);
      setProjects([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [entriesData, clientsData, projectsData] = await Promise.all([
        api.getTimeEntries(date, userId),
        api.getClients(),
        api.getProjects(),
      ]);
      setEntries(entriesData);
      setClients(clientsData);
      setProjects(projectsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [date, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function addRow() {
    const lastStop = [...entries].reverse().find(e => e.stop_time)?.stop_time || '';
    const entry = newBlankEntry(date);
    entry.start_time = lastStop;
    setEntries(prev => [...prev, entry]);
  }

  async function handleSave(row) {
    setError('');
    try {
      const payload = {
        client_id: row.client_id || undefined,
        project_id: row.project_id || null,
        entry_date: row.entry_date || date,
        start_time: row.start_time || null,
        stop_time: row.stop_time || null,
        sales_count: row.sales_count !== '' ? row.sales_count : null,
        notes: row.notes || null,
      };
      if (row._isNew && userId) {
        payload.user_id = Number(userId);
      }

      let saved;
      if (row._isNew) {
        saved = await api.createTimeEntry(payload);
      } else {
        saved = await api.updateTimeEntry(row.id, payload);
      }

      setEntries(prev =>
        prev.map(e => (e.id === row.id ? { ...saved, _key: e._key ?? saved.id } : e))
      );
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(row) {
    setError('');
    if (row._isNew) {
      setEntries(prev => prev.filter(e => e.id !== row.id));
      return;
    }
    try {
      await api.deleteTimeEntry(row.id);
      setEntries(prev => prev.filter(e => e.id !== row.id));
    } catch (e) {
      setError(e.message);
    }
  }

  const savedEntries = entries.filter(e => !e._isNew);
  const activeUsers = users.filter(u => u.active);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-4">Edit User Time</h1>

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">User</label>
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
          >
            <option value="">— Select user —</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.id}>{u.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {payPeriod && (
          <span className="text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 px-2 py-1 rounded-lg">
            {payPeriod.label}
          </span>
        )}
        <button
          onClick={loadData}
          className="text-sm text-emerald-400 hover:text-emerald-300 underline"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-red-400 mb-3 text-sm">{error}</p>}

      {!userId ? (
        <p className="text-slate-400">Select a user to view and edit their time entries.</p>
      ) : loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-slate-700 rounded-xl shadow border border-slate-600">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-xs uppercase">
                  <th className="px-2 py-2 text-left">Client</th>
                  <th className="px-2 py-2 text-left">Project</th>
                  <th className="px-2 py-2 text-left">Start</th>
                  <th className="px-2 py-2 text-left">Stop</th>
                  <th className="px-2 py-2 text-left">Sales</th>
                  <th className="px-2 py-2 text-center">Time (qtr-hrs)</th>
                  <th className="px-2 py-2 text-left">Notes</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-slate-400 text-center">
                      No entries for this date. Click &quot;+ Add Entry&quot; to start.
                    </td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <TimeRow
                      key={entry._key ?? entry.id}
                      entry={entry}
                      clients={clients}
                      allProjects={projects}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Add Entry
          </button>

          <ClientSummary entries={savedEntries} clients={clients} projects={projects} />
        </>
      )}
    </div>
  );
}
