import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetDeviceQuery, useReportLostMutation, useTransferDeviceMutation, useGetUsersQuery, useCreateCaseMutation } from '../store/api';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import TransferTimeline from '../components/TransferTimeline';
import ActivityChart from '../components/ActivityChart';
import { TransferLog, ActivityLog, AuditCase } from '../types';
import { format, formatDistanceToNow } from 'date-fns';

type Tab = 'overview' | 'transfers' | 'activity' | 'cases' | 'risk';

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const { data: device, isLoading } = useGetDeviceQuery(id!);
  const { data: users } = useGetUsersQuery({});
  const [reportLost] = useReportLostMutation();
  const [transferDevice] = useTransferDeviceMutation();
  const [createCase] = useCreateCaseMutation();

  const handleReportLost = async () => {
    if (!confirm('Are you sure you want to report this device as LOST?')) return;
    await reportLost(id!);
    navigate('/devices');
  };

  const handleTransfer = async () => {
    if (!transferTo) return;
    await transferDevice({ id: id!, toUserId: transferTo, notes: transferNotes });
    setShowTransferModal(false);
  };

  const handleCreateCase = async () => {
    await createCase({ deviceId: id!, reason: 'Manual audit case created', priority: 'MEDIUM' });
    navigate('/cases');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zamtel-green"></div>
      </div>
    );
  }

  if (!device) {
    return <div className="card text-center py-12 text-gray-500">Device not found</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'transfers', label: 'Transfer History' },
    { key: 'activity', label: 'Activity' },
    { key: 'cases', label: 'Audit Cases' },
    { key: 'risk', label: 'Risk Breakdown' },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/devices')} className="text-zamtel-green text-sm hover:underline flex items-center gap-1">
        ← Back to Devices
      </button>

      {/* Device profile card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zamtel-green/10 flex items-center justify-center text-2xl">
              📱
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{device.assetTag}</h1>
              <p className="text-gray-500 text-sm">{device.model}</p>
              <p className="font-mono text-xs text-gray-400 mt-1">{device.imei}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={device.status} />
                <RiskBadge score={device.riskScore} showLabel />
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowTransferModal(true)} className="btn-secondary text-sm py-1.5">
              📤 Transfer
            </button>
            <button onClick={handleCreateCase} className="btn-secondary text-sm py-1.5">
              📋 Create Case
            </button>
            <button onClick={handleReportLost} className="btn-danger text-sm py-1.5">
              🚨 Report Lost
            </button>
          </div>
        </div>

        {/* Device info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'MSISDN', value: device.msisdn || '—' },
            { label: 'Province', value: device.province || '—' },
            { label: 'Zone', value: device.zone || '—' },
            { label: 'Outlet', value: device.outlet || '—' },
            { label: 'Batch ID', value: device.batchId || '—' },
            { label: 'Serial No', value: device.serialNo || '—' },
            { label: 'Created', value: format(new Date(device.createdAt), 'dd MMM yyyy') },
            { label: 'Last Activity', value: device.lastActivityAt ? formatDistanceToNow(new Date(device.lastActivityAt), { addSuffix: true }) : '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custodian card */}
      {device.custodian && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-3">Current Custodian</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zamtel-green/20 flex items-center justify-center font-bold text-zamtel-green">
              {device.custodian.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-800">{device.custodian.name}</p>
              <p className="text-sm text-gray-500">{device.custodian.staffId} · {device.custodian.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-zamtel-green text-zamtel-green'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700">Device Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <p><span className="text-gray-500">Internal SIM:</span> <span className="ml-2">{device.internalSim || '—'}</span></p>
                <p><span className="text-gray-500">District:</span> <span className="ml-2">{device.district || '—'}</span></p>
                <p><span className="text-gray-500">Route:</span> <span className="ml-2">{device.route || '—'}</span></p>
              </div>
            </div>
          )}

          {activeTab === 'transfers' && (
            <TransferTimeline transfers={(device.transfers as TransferLog[]) || []} />
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 className="font-medium text-gray-700 mb-4">Registrations (Last 30 days)</h3>
              <ActivityChart activities={(device.activities as ActivityLog[]) || []} />
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="space-y-3">
              {device.auditCases && (device.auditCases as AuditCase[]).length > 0 ? (
                (device.auditCases as AuditCase[]).map((c) => (
                  <div key={c.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {c.priority}
                      </span>
                      <span className="text-xs text-gray-500">{c.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{c.reason}</p>
                    {c.fieldNotes && <p className="text-xs text-gray-500 mt-1">{c.fieldNotes}</p>}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No open cases</p>
              )}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <RiskBadge score={device.riskScore} showLabel />
                <span className="text-sm text-gray-600">Overall risk score</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Flags</h3>
                {device.riskFlags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {device.riskFlags.map((flag) => (
                      <span key={flag} className="bg-red-100 text-red-700 text-xs px-3 py-1.5 rounded-full font-medium">
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No risk flags</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium text-gray-600">Risk Score Breakdown:</p>
                <p className="text-gray-500">• Inactivity (3+ days): +30 points</p>
                <p className="text-gray-500">• Off-hours activity (&gt;10): +50 points</p>
                <p className="text-gray-500">• SIM swaps (&gt;2/week): +30 points</p>
                <p className="text-gray-500">• Max score: 100</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Transfer Device</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="input"
                >
                  <option value="">Select user...</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.staffId})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="input resize-none h-20"
                  placeholder="Transfer notes..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleTransfer} className="btn-primary flex-1">Confirm Transfer</button>
                <button onClick={() => setShowTransferModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
