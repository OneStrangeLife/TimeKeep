import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Teleprompter from '../components/Teleprompter.jsx';

const blankScript = {
  title: '', content: '', font_size: 32,
  fg_color: '#FFFFFF', bg_color: '#000000',
  scroll_speed: 3, owner_id: '__self__',
};

const inputCls = 'border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full';

function ScriptForm({ data, onChange, onSubmit, onCancel, submitLabel, isAdmin, currentUser, users }) {
  const upd = (field, val) => onChange({ ...data, [field]: val });
  return (
    <form onSubmit={onSubmit} className="bg-slate-700 rounded-xl border border-emerald-600/50 p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Title</label>
          <input className={inputCls} value={data.title} onChange={e => upd('title', e.target.value)} placeholder="Script title" required />
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Owner</label>
            <select className={inputCls} value={data.owner_id ?? ''} onChange={e => upd('owner_id', e.target.value)}>
              <option value="">Public (all users)</option>
              <option value="__self__">Me ({currentUser.display_name})</option>
              {users.filter(u => u.active && u.id !== currentUser.id).map(u => (
                <option key={u.id} value={u.id}>{u.display_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Script Content</label>
        <textarea
          className={inputCls + ' resize-y'}
          rows={6}
          value={data.content}
          onChange={e => upd('content', e.target.value)}
          placeholder="Enter the script text here..."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Font Size (px)</label>
          <input type="number" min={12} max={120} className={inputCls} value={data.font_size} onChange={e => upd('font_size', Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Text Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={data.fg_color} onChange={e => upd('fg_color', e.target.value)} className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent" />
            <span className="text-xs text-slate-400 font-mono">{data.fg_color}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Background</label>
          <div className="flex items-center gap-2">
            <input type="color" value={data.bg_color} onChange={e => upd('bg_color', e.target.value)} className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent" />
            <span className="text-xs text-slate-400 font-mono">{data.bg_color}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Scroll Speed (1–10)</label>
          <div className="flex items-center gap-2">
            <input type="range" min={1} max={10} value={data.scroll_speed} onChange={e => upd('scroll_speed', Number(e.target.value))} className="flex-1 accent-emerald-500" />
            <span className="text-white text-sm font-mono w-4 text-center">{data.scroll_speed}</span>
          </div>
        </div>
      </div>

      {/* Preview strip */}
      <div className="rounded-lg overflow-hidden border border-slate-600">
        <div
          className="px-4 py-2 truncate"
          style={{
            backgroundColor: data.bg_color,
            color: data.fg_color,
            fontSize: `${Math.min(data.font_size, 24)}px`,
          }}
        >
          {data.content?.slice(0, 100) || 'Preview will appear here...'}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-300 px-3 py-1.5">Cancel</button>
        <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">{submitLabel}</button>
      </div>
    </form>
  );
}

function ScriptCard({ s, canEdit, currentUser, isAdmin, users, editing, setEditing, handleSaveEdit, setPlaying, openPopup, handleDelete }) {
  if (editing?.id === s.id) {
    return (
      <ScriptForm
        data={editing}
        onChange={setEditing}
        onSubmit={e => { e.preventDefault(); handleSaveEdit(s.id); }}
        onCancel={() => setEditing(null)}
        submitLabel="Save"
        isAdmin={isAdmin}
        currentUser={currentUser}
        users={users}
      />
    );
  }

  return (
    <div className="bg-slate-700 rounded-xl border border-slate-600 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">{s.title}</span>
            {!s.owner_id && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Public</span>
            )}
            {s.owner_id && s.owner_id !== currentUser.id && s.owner_display_name && (
              <span className="text-xs text-slate-500">{s.owner_display_name}</span>
            )}
          </div>
          <p className="text-slate-400 text-sm truncate">{s.content?.slice(0, 120) || '(empty script)'}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>{s.font_size}px</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded border border-slate-600" style={{ backgroundColor: s.fg_color }} />
              <span className="inline-block w-3 h-3 rounded border border-slate-600" style={{ backgroundColor: s.bg_color }} />
            </span>
            <span>Speed {s.scroll_speed}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => setPlaying(s)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1 rounded-lg transition-colors"
          >
            ▶ Play
          </button>
          <button
            onClick={() => openPopup(s.id)}
            className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-1 rounded-lg transition-colors"
          >
            ↗ Pop Out
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => setEditing({
                  ...s,
                  owner_id: s.owner_id === null ? '' : (s.owner_id === currentUser.id ? '__self__' : s.owner_id),
                })}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, canEdit, currentUser, isAdmin, users, editing, setEditing, handleSaveEdit, setPlaying, openPopup, handleDelete }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</h2>
      <div className="space-y-3">
        {items.map(s => (
          <ScriptCard
            key={s.id}
            s={s}
            canEdit={canEdit}
            currentUser={currentUser}
            isAdmin={isAdmin}
            users={users}
            editing={editing}
            setEditing={setEditing}
            handleSaveEdit={handleSaveEdit}
            setPlaying={setPlaying}
            openPopup={openPopup}
            handleDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default function Scripts() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [users, setUsers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newScript, setNewScript] = useState({ ...blankScript });
  const [editing, setEditing] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    if (user.is_admin) api.getUsers().then(setUsers).catch(() => {});
  }, []);

  async function load() {
    try { setScripts(await api.getScripts()); }
    catch (e) { setError(e.message); }
  }

  // Resolve owner_id for API: '__self__' -> user.id, '' -> null (public)
  function resolveOwner(val) {
    if (val === '__self__' || val === user.id || val === String(user.id)) return user.id;
    if (val === '' || val === null || val === undefined) return null;
    return Number(val);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createScript({
        ...newScript,
        owner_id: resolveOwner(newScript.owner_id),
      });
      setNewScript({ ...blankScript });
      setAdding(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleSaveEdit(id) {
    setError('');
    try {
      await api.updateScript(id, {
        ...editing,
        owner_id: resolveOwner(editing.owner_id),
      });
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.deleteScript(id);
      load();
    } catch (e) { setError(e.message); }
  }

  function openPopup(scriptId) {
    window.open(
      `/teleprompter/${scriptId}`,
      `prompter_${scriptId}`,
      'width=600,height=500,menubar=no,toolbar=no,location=no,status=no'
    );
  }

  // Group scripts
  const publicScripts = scripts.filter(s => !s.owner_id);
  const myScripts = scripts.filter(s => s.owner_id === user.id);
  const otherScripts = scripts.filter(s => s.owner_id && s.owner_id !== user.id);

  // Shared props for sections/cards
  const shared = {
    currentUser: user,
    isAdmin: user.is_admin,
    users,
    editing,
    setEditing,
    handleSaveEdit,
    setPlaying,
    openPopup,
    handleDelete,
  };

  // If playing a script inline, show the teleprompter
  if (playing) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Teleprompter script={playing} onClose={() => setPlaying(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Scripts</h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
          >
            + Add Script
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {adding && (
        <ScriptForm
          data={newScript}
          onChange={setNewScript}
          onSubmit={handleAdd}
          onCancel={() => { setAdding(false); setNewScript({ ...blankScript }); }}
          submitLabel="Create Script"
          isAdmin={user.is_admin}
          currentUser={user}
          users={users}
        />
      )}

      <Section title="Public Scripts" items={publicScripts} canEdit={user.is_admin} {...shared} />
      <Section title="My Scripts" items={myScripts} canEdit={true} {...shared} />
      {user.is_admin && <Section title="Other Users' Scripts" items={otherScripts} canEdit={true} {...shared} />}

      {scripts.length === 0 && !adding && (
        <p className="text-slate-400 text-sm">No scripts yet. Click "+ Add Script" to create one.</p>
      )}
    </div>
  );
}
