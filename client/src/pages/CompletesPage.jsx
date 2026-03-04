import React from 'react';
import CompletesPanel from '../components/CompletesPanel.jsx';

export default function CompletesPage() {
  return (
    <div className="min-h-screen bg-slate-800 p-4 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-white">Completes</h1>
          <button
            type="button"
            onClick={() => window.close()}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Close window
          </button>
        </div>
        <CompletesPanel showPopOutButton={false} compact={false} />
      </div>
    </div>
  );
}
