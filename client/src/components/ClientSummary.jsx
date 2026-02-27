import React from 'react';

export default function ClientSummary({ entries, clients, projects }) {
  // Build per-client, per-project summary
  const byClient = {};

  for (const e of entries) {
    if (!e.client_id) continue;
    const cKey = e.client_id;
    if (!byClient[cKey]) {
      const client = clients.find(c => c.id === Number(e.client_id));
      byClient[cKey] = {
        name: client?.name || e.client_name || 'Unknown',
        projects: {},
        totalHours: 0,
        totalSales: 0,
      };
    }
    const pKey = e.project_id || '__none__';
    if (!byClient[cKey].projects[pKey]) {
      const proj = projects.find(p => p.id === Number(e.project_id));
      byClient[cKey].projects[pKey] = {
        name: proj?.name || e.project_name || '(No project)',
        hours: 0,
        sales: 0,
      };
    }
    byClient[cKey].projects[pKey].hours += e.duration_hours || 0;
    byClient[cKey].projects[pKey].sales += Number(e.sales_count) || 0;
    byClient[cKey].totalHours += e.duration_hours || 0;
    byClient[cKey].totalSales += Number(e.sales_count) || 0;
  }

  const clientList = Object.values(byClient);
  if (clientList.length === 0) return null;

  const grandHours = clientList.reduce((s, c) => s + c.totalHours, 0);
  const grandSales = clientList.reduce((s, c) => s + c.totalSales, 0);

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Daily Summary</h2>
      <div className="space-y-4">
        {clientList.map((c, i) => (
          <div key={i}>
            <div className="flex justify-between font-semibold text-gray-800 border-b pb-1">
              <span>{c.name}</span>
              <span className="font-mono">{c.totalHours.toFixed(2)} h{c.totalSales > 0 ? ` · ${c.totalSales} sales` : ''}</span>
            </div>
            <ul className="pl-4 mt-1 space-y-0.5">
              {Object.values(c.projects).map((p, j) => (
                <li key={j} className="flex justify-between text-sm text-gray-600">
                  <span>{p.name}</span>
                  <span className="font-mono">{p.hours.toFixed(2)} h{p.sales > 0 ? ` · ${p.sales} sales` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
          <span>Grand Total</span>
          <span className="font-mono">{grandHours.toFixed(2)} h{grandSales > 0 ? ` · ${grandSales} sales` : ''}</span>
        </div>
      </div>
    </div>
  );
}
