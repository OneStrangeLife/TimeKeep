import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

function ConfirmButton({ onConfirm, label = 'Deactivate', className = '' }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex gap-1">
        <button onClick={onConfirm} className="text-red-400 text-xs underline">Confirm</button>
        <button onClick={() => setConfirming(false)} className="text-slate-400 text-xs underline">Cancel</button>
      </span>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className={`text-xs text-red-400 hover:text-red-300 underline ${className}`}>
      {label}
    </button>
  );
}

export default function Setup() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const [newClientName, setNewClientName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { loadClients(); }, []);
  useEffect(() => { if (selectedClient) loadProjects(selectedClient.id); else setProjects([]); }, [selectedClient]);

  async function loadClients() {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (e) { setError(e.message); }
  }

  async function loadProjects(clientId) {
    try {
      const data = await api.getProjects(clientId);
      setProjects(data);
    } catch (e) { setError(e.message); }
  }

  async function addClient(e) {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      await api.createClient(newClientName.trim());
      setNewClientName('');
      loadClients();
    } catch (e) { setError(e.message); }
  }

  async function saveClientEdit(id) {
    try {
      await api.updateClient(id, { name: editingClient.name });
      setEditingClient(null);
      loadClients();
    } catch (e) { setError(e.message); }
  }

  async function deactivateClient(id) {
    try {
      await api.deleteClient(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      loadClients();
    } catch (e) { setError(e.message); }
  }

  async function addProject(e) {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedClient) return;
    try {
      await api.createProject(selectedClient.id, newProjectName.trim());
      setNewProjectName('');
      loadProjects(selectedClient.id);
    } catch (e) { setError(e.message); }
  }

  async function saveProjectEdit(id) {
    try {
      await api.updateProject(id, { name: editingProject.name });
      setEditingProject(null);
      loadProjects(selectedClient.id);
    } catch (e) { setError(e.message); }
  }

  async function deactivateProject(id) {
    try {
      await api.deleteProject(id);
      loadProjects(selectedClient.id);
    } catch (e) { setError(e.message); }
  }

  const visibleClients = clients.filter(c => showInactive || c.active);
  const visibleProjects = projects.filter(p => showInactive || p.active);

  const inputCls = 'border border-slate-600 rounded-lg px-2 py-1 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1';

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Setup</h1>
      {error && <p className="text-red-400 mb-3">{error}</p>}

      <label className="flex items-center gap-2 text-sm text-slate-400 mb-4 cursor-pointer">
        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
        Show inactive
      </label>

      <div className="grid grid-cols-2 gap-6">
        {/* Clients panel */}
        <div className="bg-slate-700 rounded-xl shadow border border-slate-600 p-4">
          <h2 className="text-lg font-semibold mb-3 text-white">Clients</h2>
          <ul className="divide-y divide-slate-600 mb-4">
            {visibleClients.map(c => (
              <li
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`py-2 px-2 flex items-center justify-between cursor-pointer rounded transition-colors hover:bg-slate-600 ${selectedClient?.id === c.id ? 'bg-emerald-900/40 border border-emerald-700/50' : ''} ${!c.active ? 'text-slate-500' : 'text-slate-200'}`}
              >
                {editingClient?.id === c.id ? (
                  <span className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                    <input
                      className={inputCls}
                      value={editingClient.name}
                      onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && saveClientEdit(c.id)}
                      autoFocus
                    />
                    <button onClick={() => saveClientEdit(c.id)} className="text-emerald-400 text-xs underline">Save</button>
                    <button onClick={() => setEditingClient(null)} className="text-slate-400 text-xs underline">Cancel</button>
                  </span>
                ) : (
                  <>
                    <span className="flex-1">{c.name} {!c.active && <span className="text-xs text-slate-500">(inactive)</span>}</span>
                    <span className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditingClient({ id: c.id, name: c.name })} className="text-xs text-emerald-400 hover:text-emerald-300 underline">Edit</button>
                      {c.active && <ConfirmButton onConfirm={() => deactivateClient(c.id)} />}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={addClient} className="flex gap-2">
            <input
              className={inputCls}
              placeholder="New client name"
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
            />
            <button type="submit" className="bg-emerald-500 text-white text-sm px-3 py-1 rounded-lg hover:bg-emerald-600 transition-colors">Add</button>
          </form>
        </div>

        {/* Projects panel */}
        <div className="bg-slate-700 rounded-xl shadow border border-slate-600 p-4">
          <h2 className="text-lg font-semibold mb-1 text-white">
            Projects {selectedClient ? <span className="text-emerald-400">— {selectedClient.name}</span> : <span className="text-slate-500 text-base">(select a client)</span>}
          </h2>
          {!selectedClient ? (
            <p className="text-slate-400 text-sm mt-3">Click a client to manage its projects.</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-600 mb-4 mt-3">
                {visibleProjects.map(p => (
                  <li key={p.id} className={`py-2 px-2 flex items-center justify-between ${!p.active ? 'text-slate-500' : 'text-slate-200'}`}>
                    {editingProject?.id === p.id ? (
                      <span className="flex gap-2 flex-1">
                        <input
                          className={inputCls}
                          value={editingProject.name}
                          onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && saveProjectEdit(p.id)}
                          autoFocus
                        />
                        <button onClick={() => saveProjectEdit(p.id)} className="text-emerald-400 text-xs underline">Save</button>
                        <button onClick={() => setEditingProject(null)} className="text-slate-400 text-xs underline">Cancel</button>
                      </span>
                    ) : (
                      <>
                        <span className="flex-1">{p.name} {!p.active && <span className="text-xs text-slate-500">(inactive)</span>}</span>
                        <span className="flex gap-2">
                          <button onClick={() => setEditingProject({ id: p.id, name: p.name })} className="text-xs text-emerald-400 hover:text-emerald-300 underline">Edit</button>
                          {p.active && <ConfirmButton onConfirm={() => deactivateProject(p.id)} />}
                        </span>
                      </>
                    )}
                  </li>
                ))}
                {visibleProjects.length === 0 && <li className="text-slate-400 text-sm py-2">No projects yet.</li>}
              </ul>
              <form onSubmit={addProject} className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="New project name"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                />
                <button type="submit" className="bg-emerald-500 text-white text-sm px-3 py-1 rounded-lg hover:bg-emerald-600 transition-colors">Add</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
