import { useNavigate } from 'react-router-dom';
import { useGetAuditorDashboardQuery } from '../store/api';
import { AuditCase, Device } from '../types';
import { formatDistanceToNow } from 'date-fns';
import RiskBadge from '../components/RiskBadge';

function priorityColor(priority: string) {
  if (priority === 'CRITICAL') return 'border-l-red-500 bg-red-50';
  if (priority === 'HIGH') return 'border-l-orange-400 bg-orange-50';
  return 'border-l-yellow-400 bg-yellow-50';
}

function priorityBadge(priority: string) {
  if (priority === 'CRITICAL') return 'bg-red-100 text-red-700';
  if (priority === 'HIGH') return 'bg-orange-100 text-orange-700';
  return 'bg-yellow-100 text-yellow-700';
}

export default function AuditorWorkbench() {
  const { data, isLoading } = useGetAuditorDashboardQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zamtel-green"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Open Cases', value: data?.openCases || 0, icon: '📋', color: 'bg-blue-50 text-blue-700' },
    { label: 'Critical Alerts', value: data?.criticalAlerts || 0, icon: '🚨', color: 'bg-red-50 text-red-700' },
    { label: 'Devices Overdue', value: data?.devicesOverdue || 0, icon: '⏰', color: 'bg-orange-50 text-orange-700' },
    { label: 'Pending Acks', value: data?.pendingAcks || 0, icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditor Workbench</h1>
        <p className="text-gray-500 text-sm mt-1">Your audit queue and alerts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.color} text-lg mb-3`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Recent Cases</h2>
            <button onClick={() => navigate('/cases')} className="text-zamtel-green text-sm hover:underline">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {data?.recentCases && data.recentCases.length > 0 ? (
              data.recentCases.map((c: AuditCase) => (
                <div
                  key={c.id}
                  className={`border-l-4 rounded-r-lg p-3 cursor-pointer hover:shadow-sm transition ${priorityColor(c.priority)}`}
                  onClick={() => navigate(`/cases`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-600">{(c.device as Device | undefined)?.imei || c.deviceId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge(c.priority)}`}>
                      {c.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-1">{c.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No cases assigned</p>
            )}
          </div>
        </div>

        {/* Top Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">High Risk Devices</h2>
            <button onClick={() => navigate('/alerts')} className="text-zamtel-green text-sm hover:underline">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {data?.topAlerts && data.topAlerts.length > 0 ? (
              data.topAlerts.map((device: Device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium text-gray-800 truncate">{device.imei}</p>
                    <p className="text-xs text-gray-500">{device.model} · {device.province || '—'}</p>
                    {device.custodian && (
                      <p className="text-xs text-gray-400">{device.custodian.name}</p>
                    )}
                  </div>
                  <RiskBadge score={device.riskScore} />
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No high risk devices</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
