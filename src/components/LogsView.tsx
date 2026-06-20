/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { History, ShieldCheck, Search, Clock, ShieldX, RefreshCw } from "lucide-react";
import { ActivityLog, UserRole } from "../types";

export default function LogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Offline node logs stream unreachable.");
      const data = await res.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to sink administrative ledger activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.userName.toLowerCase().includes(query) ||
      log.userId.toLowerCase().includes(query)
    );
  });

  if (loading && logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider mt-2 font-bold">Parsing workstation transaction logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150 font-sans h-full flex flex-col">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-slate-200 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Audit Ledger Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Chronological log of database entries, billing checkouts, stock arrival logs, and cashier sign-ins.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          title="Reload audit stream"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-2xl flex items-center gap-3">
          <span className="font-bold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filter and count bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm shrink-0">
        <div className="relative w-full max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="audit-logs-search"
            type="text"
            placeholder="Search action parameter, rep cashier name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono">
          Log Capacity: {filteredLogs.length} Records
        </div>
      </div>

      {/* Logs interactive timeline mapping */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <p className="p-8 text-center text-slate-400 italic">No operational logs match your current query details.</p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-sans">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-200 rounded-lg shrink-0 mt-0.5 select-none">
                    <Clock className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white uppercase text-[11px] font-mono tracking-wider">{log.action}</span>
                      <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-500 rounded">
                        {log.userName} ({log.userId})
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1.5 text-[11px] leading-relaxed max-w-[500px]">
                      {log.details}
                    </p>
                  </div>
                </div>

                {/* Date time formatted */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-450 font-mono block">{new Date(log.date).toLocaleDateString()}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block mt-0.5">{new Date(log.date).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
