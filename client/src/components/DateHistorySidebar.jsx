import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { api } from '../api/client.js';

function formatDate(dateStr) {
  // dateStr is "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DateHistorySidebar = forwardRef(function DateHistorySidebar({ selectedDate, onSelectDate }, ref) {
  const [history, setHistory] = useState([]);

  async function load() {
    try {
      const data = await api.getDateHistory();
      setHistory(data);
    } catch {
      // silently ignore
    }
  }

  useEffect(() => { load(); }, []);

  useImperativeHandle(ref, () => ({ refresh: load }));

  return (
    <div className="w-44 shrink-0 bg-slate-700 rounded-xl border border-slate-600 p-3 flex flex-col gap-1 self-start">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Recent Days</h2>
      {history.length === 0 ? (
        <p className="text-xs text-slate-500">No entries yet.</p>
      ) : (
        <ul className="overflow-y-auto max-h-[70vh] flex flex-col gap-0.5">
          {history.map(item => (
            <li key={item.entry_date}>
              <button
                onClick={() => onSelectDate(item.entry_date)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  item.entry_date === selectedDate
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="font-medium">{formatDate(item.entry_date)}</div>
                <div className={`${item.entry_date === selectedDate ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {item.total_hours != null ? `${Number(item.total_hours).toFixed(2)} hrs` : `${item.entry_count} entr${item.entry_count === 1 ? 'y' : 'ies'}`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default DateHistorySidebar;
