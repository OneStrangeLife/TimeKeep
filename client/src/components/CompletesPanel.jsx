import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const inputCls = 'border border-slate-600 rounded px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500';

export default function CompletesPanel({ showPopOutButton = true, compact = false, fullWidth = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.getCompletes();
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showPopOutButton) return;
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [showPopOutButton, load]);

  async function handleAdd(e) {
    e.preventDefault();
    const name = newName?.trim();
    if (!name) return;
    setError('');
    try {
      const created = await api.createCompletesCampaign(name);
      setItems(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setNewName('');
    } catch (err) { setError(err.message); }
  }

  async function handleUpdateName(id, name) {
    const trimmed = name?.trim();
    if (trimmed === undefined || trimmed === '') return;
    setError('');
    try {
      const updated = await api.updateCompletesCampaign(id, { name: trimmed });
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      setEditingId(null);
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.deleteCompletesCampaign(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { setError(err.message); }
  }

  async function handleAddOne(id) {
    setError('');
    try {
      const updated = await api.addComplete(id);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } catch (err) { setError(err.message); }
  }

  async function handleSubtractOne(id) {
    setError('');
    try {
      const updated = await api.subtractComplete(id);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } catch (err) { setError(err.message); }
  }

  async function handleResetCounts() {
    setError('');
    try {
      const data = await api.resetCompletesCounts();
      setItems(data);
    } catch (err) { setError(err.message); }
  }

  async function handleResetAll() {
    setError('');
    try {
      await api.resetCompletesAll();
      setItems([]);
      setConfirmResetAll(false);
    } catch (err) { setError(err.message); }
  }

  async function handleMoveUp(index) {
    if (index <= 0) return;
    const order = items.map(i => i.id);
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    setError('');
    try {
      const data = await api.reorderCompletes(order);
      setItems(data);
    } catch (err) { setError(err.message); }
  }

  async function handleMoveDown(index) {
    if (index >= items.length - 1) return;
    const order = items.map(i => i.id);
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    setError('');
    try {
      const data = await api.reorderCompletes(order);
      setItems(data);
    } catch (err) { setError(err.message); }
  }

  function handlePopOut() {
    window.open('/completes', 'completes', 'width=380,height=640,scrollbars=yes');
  }

  if (loading) {
    return (
      <div className={`bg-slate-700 rounded-xl border border-slate-600 ${compact ? 'p-3' : 'p-4'} text-slate-400 text-sm`}>
        Loading…
      </div>
    );
  }

  return (
    <div className={`bg-slate-700 rounded-xl border border-slate-600 flex flex-col ${compact ? 'p-3' : 'p-4'} ${fullWidth ? 'w-full' : compact ? 'w-72' : 'min-w-[280px] max-w-[320px]'}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-white shrink-0">Completes</h2>
        {showPopOutButton && (
          <button
            type="button"
            onClick={handlePopOut}
            className="text-xs text-slate-400 hover:text-emerald-400 underline shrink-0"
            title="Open in new window"
          >
            Pop out
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          type="text"
          className={`${inputCls} flex-1 min-w-0`}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Campaign name"
        />
        <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-2 py-1 rounded transition-colors shrink-0">
          Add
        </button>
      </form>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm">No campaigns yet. Add one above.</p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800/60 border border-slate-600/60"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-slate-400 hover:text-white disabled:opacity-30 text-xs leading-none p-0.5"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}
                  className="text-slate-400 hover:text-white disabled:opacity-30 text-xs leading-none p-0.5"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <div className="flex-1 min-w-0">
                {editingId === item.id ? (
                  <input
                    type="text"
                    className={`${inputCls} w-full text-sm`}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleUpdateName(item.id, editingName)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.target.blur(); }
                      if (e.key === 'Escape') { setEditingId(null); setEditingName(item.name); }
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                    className="text-left text-white text-sm truncate block w-full hover:text-emerald-400"
                  >
                    {item.name}
                  </button>
                )}
              </div>
              <span className="text-slate-300 font-mono text-sm w-8 text-center shrink-0">{item.count}</span>
              <div className="flex shrink-0">
                <button
                  type="button"
                  onClick={() => handleSubtractOne(item.id)}
                  className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 text-white text-sm font-bold"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOne(item.id)}
                  className="w-7 h-7 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-red-400 hover:text-red-300 text-xs shrink-0"
                title="Remove campaign"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-600">
        <button
          type="button"
          onClick={handleResetCounts}
          disabled={items.length === 0}
          className="text-xs text-slate-400 hover:text-white disabled:opacity-50"
        >
          Reset counts
        </button>
        {confirmResetAll ? (
          <span className="flex gap-1 text-xs">
            <button type="button" onClick={handleResetAll} className="text-red-400 hover:text-red-300 underline">Confirm</button>
            <button type="button" onClick={() => setConfirmResetAll(false)} className="text-slate-400 underline">Cancel</button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmResetAll(true)}
            disabled={items.length === 0}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Reset everything
          </button>
        )}
      </div>
    </div>
  );
}
