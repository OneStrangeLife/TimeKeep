import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Teleprompter from '../components/Teleprompter.jsx';

export default function TeleprompterPopup() {
  const { id } = useParams();
  const [script, setScript] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getScripts()
      .then(scripts => {
        const found = scripts.find(s => s.id === Number(id));
        if (found) setScript(found);
        else setError('Script not found');
      })
      .catch(e => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return <Teleprompter script={script} isPopup={true} />;
}
