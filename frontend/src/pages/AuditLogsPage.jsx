import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      api.getAuditLogs().then(setLogs).catch(() => {});
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  function exportCSV() {
    const headers = ["Timestamp", "User", "Action", "Details"];
    const rows = logs.map(l => [
      new Date(l.created_at).toLocaleString().replace(/,/g, ''),
      l.username,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Audit_Logs_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
          <div className="pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Audit Overview</h1>
              <p className="text-xs text-slate-500 mt-1">Real-time tracking of all administrative actions for transparency.</p>
            </div>
            
            <button
              onClick={exportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
               Export CSV
            </button>
          </div>
          
          {logs.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-100 dark:border-indigo-800/50">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Total Logged Actions</p>
                <p className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">{logs.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-100 dark:border-amber-800/50">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Most Recent Action</p>
                <p className="text-sm font-bold text-amber-950 dark:text-amber-100 mt-1 truncate">
                  {logs[0].action}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">by @{logs[0].username}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 border border-emerald-100 dark:border-emerald-800/50">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Active Users Today</p>
                <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                  {new Set(logs.map(l => l.username)).size}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <ul className="space-y-4">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 transition hover:border-slate-200 dark:hover:border-slate-700">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold shadow-sm">
                      {log.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {log.action} <span className="text-slate-400 font-medium text-xs">by @{log.username}</span>
                      </p>
                      <time className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </li>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-10">No audit logs available.</p>
              )}
            </ul>
          </div>
        </section>
      </div>
    </Layout>
  );
}
