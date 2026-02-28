import React, { useState, useEffect } from 'react';

export default function TimeRow({ entry, clients, allProjects, onSave, onDelete }) {
  const [row, setRow] = useState({ ...entry });
  const [saving, setSaving] = useState(false);

  // Filter projects for selected client
  const projects = allProjects.filter(
    p => p.client_id === (row.client_id ? Number(row.client_id) : null) && p.active
  );

  // Reset project when client changes
  function handleClientChange(e) {
    setRow(r => ({ ...r, client_id: e.target.value, project_id: '' }));
  }

  function set(field) {
    return e => setRow(r => ({ ...r, [field]: e.target.value }));
  }

  function stampStop() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setRow(r => ({ ...r, stop_time: `${hh}:${mm}` }));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(row);
    } finally {
      setSaving(false);
    }
  }

  // Auto-save when stop_time is set and start_time exists
  useEffect(() => {
    if (row.stop_time && row.start_time && row.client_id && row.id) {
      save();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.stop_time]);

  const durLabel = row.duration_hours != null
    ? `${row.duration_hours.toFixed(2)} h`
    : '—';

  const cellCls = 'px-2 py-1';
  const inputCls = 'border border-slate-600 rounded-lg px-1 py-0.5 text-sm w-full bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <tr className="border-b border-slate-600 hover:bg-slate-600/40 transition-colors">
      {/* Client */}
      <td className={cellCls}>
        <select value={row.client_id || ''} onChange={handleClientChange} className={inputCls}>
          <option value="">— Client —</option>
          {clients.filter(c => c.active).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>

      {/* Project */}
      <td className={cellCls}>
        <select value={row.project_id || ''} onChange={set('project_id')} className={inputCls} disabled={!row.client_id}>
          <option value="">— Project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </td>

      {/* Start */}
      <td className={cellCls}>
        <input type="time" value={row.start_time || ''} onChange={set('start_time')} className={inputCls} />
      </td>

      {/* Stop */}
      <td className={`${cellCls} flex items-center gap-1`}>
        <input type="time" value={row.stop_time || ''} onChange={set('stop_time')} className={`${inputCls} flex-1`} />
        {!row.stop_time && row.start_time && (
          <button onClick={stampStop} title="Stamp current time" className="text-xs bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-400 px-1 rounded transition-colors">
            Now
          </button>
        )}
      </td>

      {/* Sales */}
      <td className={cellCls}>
        <input
          type="number"
          min="0"
          value={row.sales_count || ''}
          onChange={set('sales_count')}
          className={`${inputCls} w-16`}
          placeholder="0"
        />
      </td>

      {/* Duration */}
      <td className={`${cellCls} text-center text-sm font-mono text-emerald-400 whitespace-nowrap`}>
        {durLabel}
      </td>

      {/* Notes */}
      <td className={cellCls}>
        <input type="text" value={row.notes || ''} onChange={set('notes')} className={inputCls} placeholder="Notes…" />
      </td>

      {/* Actions */}
      <td className={cellCls}>
        <span className="flex gap-1">
          <button
            onClick={save}
            disabled={saving || !row.client_id}
            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-0.5 rounded disabled:opacity-40 transition-colors"
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            onClick={() => onDelete(row)}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Del
          </button>
        </span>
      </td>
    </tr>
  );
}
