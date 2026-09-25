import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Clock, User, ArrowUpDown, ChevronDown } from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { AuditLogItem } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <AdminLayout activePath="audit-logs">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">System Audit Trail</h1>
            <p className="text-xs text-slate-500 mt-1">Immutable forensic event logging of administrative actions, biometrics, and security events</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="">All Action Types</option>
              <option value="ADMIN_LOGIN">ADMIN LOGIN</option>
              <option value="STUDENT_LOGIN">STUDENT LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN FAILED</option>
              <option value="STUDENT_REGISTER">STUDENT REGISTER</option>
              <option value="STUDENT_UPDATE">STUDENT UPDATE</option>
              <option value="STUDENT_DEACTIVATE">STUDENT DEACTIVATE</option>
              <option value="FACE_REGISTERED">FACE REGISTERED</option>
              <option value="ATTENDANCE_MARKED">ATTENDANCE MARKED</option>
              <option value="ATTENDANCE_OVERRIDE">ATTENDANCE OVERRIDE</option>
              <option value="SESSION_CREATED">SESSION CREATED</option>
              <option value="SETTINGS_UPDATE">SETTINGS UPDATE</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Actor User</th>
                  <th className="px-4 py-3.5">Event Action</th>
                  <th className="px-4 py-3.5">Target Entity</th>
                  <th className="px-4 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                      No audit events recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 text-slate-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-sans font-semibold text-slate-800">
                        {log.user_email || 'SYSTEM'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-slate-100 text-slate-800 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-sans">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium"
                        >
                          Inspect Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspect Log Details Modal */}
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event #${selectedLog?.id} • ${selectedLog?.action}`}
          subtitle={`Recorded on ${selectedLog ? new Date(selectedLog.timestamp).toLocaleString() : ''}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Initiator</span>
                <span className="font-semibold text-slate-800">{selectedLog?.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entity Affected</span>
                <span className="font-semibold text-slate-800">{selectedLog?.entity_type} {selectedLog?.entity_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Network Host</span>
                <span className="font-mono text-slate-700">{selectedLog?.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            <div>
              <span className="block font-semibold text-slate-700 mb-1">Event Metadata Payload (JSON)</span>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog?.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};
