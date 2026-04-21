import { useState } from 'react';
import { useGetCasesQuery, useUpdateCaseMutation, useCreateCaseMutation, useGetDevicesQuery, useGetUsersQuery } from '../store/api';
import StatusBadge from '../components/StatusBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { AlertTriangle, Plus, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AuditCase } from '../types';

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-200',
  HIGH:     'bg-orange-100 text-orange-800 border border-orange-200',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
  LOW:      'bg-gray-100 text-gray-700 border border-gray-200',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  RESOLVED:    'bg-green-100 text-green-800',
  ESCALATED:   'bg-red-100 text-red-800',
};

export default function AuditCases() {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState<AuditCase | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data, isLoading, refetch } = useGetCasesQuery({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    page,
    limit: 20,
  });

  const [updateCase, { isLoading: updating }] = useUpdateCaseMutation();
  const [createCase, { isLoading: creating }] = useCreateCaseMutation();
  const { data: devices } = useGetDevicesQuery({});
  const { data: users } = useGetUsersQuery({ role: 'TRADE_AUDITOR' });

  // Create case form state
  const [newCase, setNewCase] = useState({ deviceId: '', auditorId: '', priority: 'MEDIUM', reason: '' });

  const handleUpdate = async () => {
    if (!selectedCase) return;
    try {
      await updateCase({
        id: selectedCase.id,
        data: {
          fieldNotes: notes || selectedCase.fieldNotes,
          resolution: resolution || selectedCase.resolution,
          status: newStatus || selectedCase.status,
        },
      }).unwrap();
      toast.success('Case updated');
      setSelectedCase(null);
      refetch();
    } catch { toast.error('Failed to update case'); }
  };

  const handleCreate = async () => {
    if (!newCase.deviceId || !newCase.auditorId || !newCase.reason) {
      toast.error('Device, auditor and reason are required'); return;
    }
    try {
      await createCase(newCase).unwrap();
      toast.success('Case created');
      setShowCreate(false);
      setNewCase({ deviceId: '', auditorId: '', priority: 'MEDIUM', reason: '' });
      refetch();
    } catch { toast.error('Failed to create case'); }
  };

  const openCase = (c: AuditCase) => {
    setSelectedCase(c);
    setNotes(c.fieldNotes || '');
    setResolution(c.resolution || '');
    setNewStatus(c.status);
  };

  const daysOpen = (createdAt: string) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.pagination.total ?? 0} total cases</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-800 transition"
        >
          <Plus className="w-4 h-4" /> New Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusFilter === s ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All Status'}
          </button>
        ))}
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
          className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
          <option value="">All Priorities</option>
          {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading cases...</div>
        ) : !data?.cases.length ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No cases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Device','Priority','Status','Reason','Auditor','Opened','Days Open',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.cases.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => openCase(c)}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-700 font-semibold">{c.device?.imei || c.deviceId.slice(0,8)}</p>
                      <p className="text-xs text-gray-400">{c.device?.assetTag}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${PRIORITY_COLOR[c.priority]}`}>
                        {c.priority === 'CRITICAL' && '🚨 '}{c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[c.status]}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-700 truncate">{c.reason}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.auditor?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-xs ${daysOpen(c.createdAt) > 5 ? 'text-red-600' : daysOpen(c.createdAt) > 2 ? 'text-orange-500' : 'text-gray-500'}`}>
                        {daysOpen(c.createdAt)}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {data.pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button disabled={page === data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Case Detail Drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedCase(null)} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-bold text-gray-900">Case Detail</h2>
                <p className="text-xs text-gray-500 mt-0.5">#{selectedCase.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Device', value: selectedCase.device?.imei || selectedCase.deviceId.slice(0,8) },
                  { label: 'Asset Tag', value: selectedCase.device?.assetTag || '—' },
                  { label: 'Auditor', value: selectedCase.auditor?.name || '—' },
                  { label: 'Opened', value: formatDistanceToNow(new Date(selectedCase.createdAt), { addSuffix: true }) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Priority & Status badges */}
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${PRIORITY_COLOR[selectedCase.priority]}`}>{selectedCase.priority}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[selectedCase.status]}`}>{selectedCase.status}</span>
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Reason</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl p-3">{selectedCase.reason}</p>
              </div>

              {/* Update Status */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Update Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white">
                  {['OPEN','IN_PROGRESS','RESOLVED','ESCALATED'].map(s => (
                    <option key={s} value={s}>{s.replace('_',' ')}</option>
                  ))}
                </select>
              </div>

              {/* Field Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Field Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Add investigation notes..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Resolution */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Resolution</label>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3}
                  placeholder="Describe the resolution..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <button onClick={handleUpdate} disabled={updating}
                className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition disabled:opacity-50">
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Create Audit Case</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Device *</label>
                <select value={newCase.deviceId} onChange={e => setNewCase(n => ({ ...n, deviceId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">Select device...</option>
                  {devices?.devices.map(d => (
                    <option key={d.id} value={d.id}>{d.imei} — {d.assetTag}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Assign Auditor *</label>
                <select value={newCase.auditorId} onChange={e => setNewCase(n => ({ ...n, auditorId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">Select auditor...</option>
                  {users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Priority</label>
                <select value={newCase.priority} onChange={e => setNewCase(n => ({ ...n, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Reason *</label>
                <textarea value={newCase.reason} onChange={e => setNewCase(n => ({ ...n, reason: e.target.value }))} rows={3}
                  placeholder="Describe why this case is being opened..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
