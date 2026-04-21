import { useState } from 'react';
import { useGetDevicesQuery, useCreateCaseMutation, useGetUsersQuery } from '../store/api';
import { Bell, AlertTriangle, Clock, MapPin, Activity, Shield, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import type { Device } from '../types';
import RiskBadge from '../components/RiskBadge';

type AlertType = 'INACTIVITY' | 'HIGH_RISK' | 'OVERDUE_ACK' | 'GEO_MISMATCH' | 'OFF_HOURS';
type Severity   = 'CRITICAL' | 'HIGH' | 'MEDIUM';

interface Alert {
  id: string;
  type: AlertType;
  severity: Severity;
  device: Device;
  message: string;
  time: string;
  dismissed?: boolean;
}

const ALERT_ICON: Record<AlertType, React.ReactNode> = {
  INACTIVITY:   <Clock className="w-4 h-4" />,
  HIGH_RISK:    <Shield className="w-4 h-4" />,
  OVERDUE_ACK:  <AlertTriangle className="w-4 h-4" />,
  GEO_MISMATCH: <MapPin className="w-4 h-4" />,
  OFF_HOURS:    <Activity className="w-4 h-4" />,
};

const SEVERITY_STYLE: Record<Severity, string> = {
  CRITICAL: 'border-l-4 border-red-500 bg-red-50',
  HIGH:     'border-l-4 border-orange-400 bg-orange-50',
  MEDIUM:   'border-l-4 border-yellow-400 bg-yellow-50',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH:     'bg-orange-100 text-orange-800',
  MEDIUM:   'bg-yellow-100 text-yellow-800',
};

const ICON_BG: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-600',
  HIGH:     'bg-orange-100 text-orange-600',
  MEDIUM:   'bg-yellow-100 text-yellow-700',
};

function buildAlerts(devices: Device[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  for (const d of devices) {
    // Inactivity
    if ((d.status === 'ACTIVE' || d.status === 'ASSIGNED') && d.lastActivityAt) {
      const hoursAgo = (now.getTime() - new Date(d.lastActivityAt).getTime()) / 3600000;
      if (hoursAgo >= 72) {
        alerts.push({
          id: `inact-${d.id}`,
          type: 'INACTIVITY',
          severity: hoursAgo >= 120 ? 'CRITICAL' : 'HIGH',
          device: d,
          message: `No SIM registrations for ${Math.floor(hoursAgo)}hrs — device may be lost or inactive`,
          time: d.lastActivityAt,
        });
      }
    }

    // High risk
    if (d.riskScore >= 80) {
      alerts.push({
        id: `risk-${d.id}`,
        type: 'HIGH_RISK',
        severity: d.riskScore >= 90 ? 'CRITICAL' : 'HIGH',
        device: d,
        message: `Risk score ${d.riskScore}/100 — ${d.riskFlags.join(', ')}`,
        time: d.updatedAt,
      });
    } else if (d.riskScore >= 60) {
      alerts.push({
        id: `risk-med-${d.id}`,
        type: 'HIGH_RISK',
        severity: 'MEDIUM',
        device: d,
        message: `Elevated risk score ${d.riskScore}/100 — monitor closely`,
        time: d.updatedAt,
      });
    }

    // Overdue acknowledgement — ASSIGNED with no activity for 24h
    if (d.status === 'ASSIGNED' && !d.lastActivityAt) {
      const hoursAssigned = (now.getTime() - new Date(d.updatedAt).getTime()) / 3600000;
      if (hoursAssigned >= 24) {
        alerts.push({
          id: `ack-${d.id}`,
          type: 'OVERDUE_ACK',
          severity: hoursAssigned >= 48 ? 'CRITICAL' : 'HIGH',
          device: d,
          message: `Device assigned ${Math.floor(hoursAssigned)}hrs ago but has not been activated`,
          time: d.updatedAt,
        });
      }
    }

    // Lost/Stolen
    if (d.status === 'LOST' || d.status === 'STOLEN') {
      alerts.push({
        id: `lost-${d.id}`,
        type: 'GEO_MISMATCH',
        severity: 'CRITICAL',
        device: d,
        message: `Device marked as ${d.status} — immediate recovery action required`,
        time: d.updatedAt,
      });
    }
  }

  // Sort: CRITICAL first, then HIGH, then MEDIUM, then by time desc
  return alerts.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });
}

export default function AlertCentre() {
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [typeFilter, setTypeFilter] = useState<AlertType | ''>('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [createCaseFor, setCreateCaseFor] = useState<Alert | null>(null);
  const [caseForm, setCaseForm] = useState({ auditorId: '', reason: '' });

  const { data, isLoading } = useGetDevicesQuery({ limit: 500 });
  const { data: auditors } = useGetUsersQuery({ role: 'TRADE_AUDITOR' });
  const [createCase, { isLoading: creating }] = useCreateCaseMutation();

  const allAlerts = data ? buildAlerts(data.devices) : [];
  const visible = allAlerts.filter(a =>
    !dismissed.has(a.id) &&
    (!severityFilter || a.severity === severityFilter) &&
    (!typeFilter || a.type === typeFilter)
  );

  const handleCreateCase = async () => {
    if (!createCaseFor || !caseForm.auditorId) { toast.error('Select an auditor'); return; }
    try {
      await createCase({
        deviceId: createCaseFor.device.id,
        auditorId: caseForm.auditorId,
        priority: createCaseFor.severity,
        reason: caseForm.reason || createCaseFor.message,
      }).unwrap();
      toast.success('Audit case created');
      setCreateCaseFor(null);
      setCaseForm({ auditorId: '', reason: '' });
      setDismissed(prev => new Set([...prev, createCaseFor.id]));
    } catch { toast.error('Failed to create case'); }
  };

  const counts = {
    CRITICAL: allAlerts.filter(a => !dismissed.has(a.id) && a.severity === 'CRITICAL').length,
    HIGH:     allAlerts.filter(a => !dismissed.has(a.id) && a.severity === 'HIGH').length,
    MEDIUM:   allAlerts.filter(a => !dismissed.has(a.id) && a.severity === 'MEDIUM').length,
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-orange-500" /> Alert Centre
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{visible.length} active alerts requiring attention</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {([['CRITICAL', 'bg-red-500', counts.CRITICAL], ['HIGH', 'bg-orange-400', counts.HIGH], ['MEDIUM', 'bg-yellow-400', counts.MEDIUM]] as const).map(([sev, bg, count]) => (
          <button key={sev} onClick={() => setSeverityFilter(severityFilter === sev ? '' : sev)}
            className={`rounded-2xl p-4 text-white text-left transition shadow-sm ${bg} ${severityFilter === sev ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:opacity-90'}`}>
            <p className="text-2xl font-black">{count}</p>
            <p className="text-xs font-semibold opacity-90">{sev}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AlertType | '')}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
          <option value="">All Types</option>
          <option value="INACTIVITY">Inactivity</option>
          <option value="HIGH_RISK">High Risk</option>
          <option value="OVERDUE_ACK">Overdue Acknowledgement</option>
          <option value="GEO_MISMATCH">Lost/Stolen</option>
        </select>
        {dismissed.size > 0 && (
          <button onClick={() => setDismissed(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto">
            Restore {dismissed.size} dismissed
          </button>
        )}
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No active alerts</p>
          <p className="text-gray-400 text-sm mt-1">All devices are behaving normally</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(alert => (
            <div key={alert.id} className={`rounded-2xl p-4 shadow-sm ${SEVERITY_STYLE[alert.severity]}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${ICON_BG[alert.severity]}`}>
                  {ALERT_ICON[alert.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {alert.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatDistanceToNow(new Date(alert.time), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-xs font-bold text-gray-700">{alert.device.imei}</p>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-600">{alert.device.assetTag}</p>
                    <RiskBadge score={alert.device.riskScore} />
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.device.province} {alert.device.zone ? `· ${alert.device.zone}` : ''} {alert.device.custodian ? `· ${alert.device.custodian.name}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 ml-11">
                <button onClick={() => { setCreateCaseFor(alert); setCaseForm({ auditorId: '', reason: alert.message }); }}
                  className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-50 transition">
                  📋 Create Case
                </button>
                <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                  className="text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:bg-white/50 transition">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      {createCaseFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Create Case from Alert</h2>
              <button onClick={() => setCreateCaseFor(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`rounded-xl p-3 ${SEVERITY_STYLE[createCaseFor.severity]}`}>
                <p className="text-xs font-bold text-gray-700">{createCaseFor.device.imei} · {createCaseFor.device.assetTag}</p>
                <p className="text-sm text-gray-700 mt-0.5">{createCaseFor.message}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Assign Auditor *</label>
                <select value={caseForm.auditorId} onChange={e => setCaseForm(f => ({ ...f, auditorId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">Select auditor...</option>
                  {auditors?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Reason</label>
                <textarea value={caseForm.reason} onChange={e => setCaseForm(f => ({ ...f, reason: e.target.value }))} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCreateCaseFor(null)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleCreateCase} disabled={creating}
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
