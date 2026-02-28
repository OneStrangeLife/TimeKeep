import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import TimeRow from '../components/TimeRow.jsx';
import ClientSummary from '../components/ClientSummary.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

let nextTempId = -1;
function newBlankEntry(date) {
  return {
    id: nextTempId--,        // negative = unsaved
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

export default function Dashboard() {
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entriesData, clientsData, projectsData] = await Promise.all([
        api.getTimeEntries(date),
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
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  function addRow() {
    setEntries(prev => [...prev, newBlankEntry(date)]);
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

      let saved;
      if (row._isNew) {
        saved = await api.createTimeEntry(payload);
      } else {
        saved = await api.updateTimeEntry(row.id, payload);
      }

      setEntries(prev =>
        prev.map(e => (e.id === row.id ? { ...saved } : e))
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

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold text-white">Time Sheet</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button onClick={loadData} className="text-sm text-emerald-400 hover:text-emerald-300 underline">Refresh</button>
      </div>

      {error && <p className="text-red-400 mb-3 text-sm">{error}</p>}

      {loading ? (
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
                      No entries for this date. Click "+ Add Entry" to start.
                    </td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <TimeRow
                      key={entry.id}
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
