import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const blank = { title: '', url: '', description: '', sort_order: 0 };

export default function Links() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newLink, setNewLink] = useState(blank);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try { setLinks(await api.getLinks()); }
    catch (e) { setError(e.message); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createLink(newLink);
      setNewLink(blank);
      setAdding(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleSaveEdit(id) {
    setError('');
    try {
      await api.updateLink(id, editing);
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.deleteLink(id);
      load();
    } catch (e) { setError(e.message); }
  }

  const inputCls = 'border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Links</h1>
        {user?.is_admin && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
          >
            + Add Link
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-slate-700 rounded-xl border border-emerald-600/50 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">New Link</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Title</label>
              <input className={inputCls} value={newLink.title} onChange={e => setNewLink(l => ({ ...l, title: e.target.value }))} placeholder="My Site" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">URL</label>
              <input className={inputCls} value={newLink.url} onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))} placeholder="https://..." required />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Description (optional)</label>
            <input className={inputCls} value={newLink.description} onChange={e => setNewLink(l => ({ ...l, description: e.target.value }))} placeholder="A short description" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAdding(false); setNewLink(blank); }} className="text-sm text-slate-400 hover:text-slate-300 px-3 py-1.5">Cancel</button>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Save</button>
          </div>
        </form>
      )}

      {/* Link cards */}
      {links.length === 0 && !adding ? (
        <p className="text-slate-400 text-sm">No links yet.</p>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="bg-slate-700 rounded-xl border border-slate-600 p-4">
              {editing?.id === link.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Title</label>
                      <input className={inputCls} value={editing.title} onChange={e => setEditing(l => ({ ...l, title: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">URL</label>
                      <input className={inputCls} value={editing.url} onChange={e => setEditing(l => ({ ...l, url: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Description</label>
                    <input className={inputCls} value={editing.description || ''} onChange={e => setEditing(l => ({ ...l, description: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-slate-300 px-3 py-1">Cancel</button>
                    <button onClick={() => handleSaveEdit(link.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 font-medium text-base transition-colors"
                    >
                      {link.title}
                    </a>
                    {link.description && (
                      <p className="text-slate-400 text-sm mt-0.5">{link.description}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-1 truncate">{link.url}</p>
                  </div>
                  {user?.is_admin && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setEditing({ ...link })} className="text-xs text-emerald-400 hover:text-emerald-300 underline">Edit</button>
                      <button onClick={() => handleDelete(link.id)} className="text-xs text-red-400 hover:text-red-300 underline">Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
