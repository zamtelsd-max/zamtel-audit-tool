import { Device } from '../types';
import RiskBadge from './RiskBadge';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  device: Device;
  onCreateCase?: (deviceId: string) => void;
  onDismiss?: (deviceId: string) => void;
}

function getAlertType(device: Device): string {
  if (device.status === 'INACTIVE') return 'Inactivity';
  if (device.riskFlags.includes('OFF_HOURS')) return 'HighRisk';
  if (device.riskFlags.includes('SIM_SWAP')) return 'HighRisk';
  if (device.riskScore > 80) return 'HighRisk';
  return 'HighRisk';
}

function getSeverityColor(score: number) {
  if (score > 80) return 'border-l-red-500 bg-red-50';
  if (score > 60) return 'border-l-orange-500 bg-orange-50';
  return 'border-l-yellow-500 bg-yellow-50';
}

export default function AlertCard({ device, onCreateCase, onDismiss }: Props) {
  const alertType = getAlertType(device);
  const severityColor = getSeverityColor(device.riskScore);
  const timeAgo = device.lastActivityAt
    ? formatDistanceToNow(new Date(device.lastActivityAt), { addSuffix: true })
    : 'Unknown';

  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${severityColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">{device.imei}</span>
            <span className="text-gray-500 text-xs">{device.assetTag}</span>
            <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5">
              {alertType}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{device.model} · {device.province || 'Unknown location'}</p>
          <div className="flex items-center gap-2 mt-2">
            <RiskBadge score={device.riskScore} />
            <span className="text-xs text-gray-500">Last activity: {timeAgo}</span>
          </div>
          {device.riskFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {device.riskFlags.map((flag) => (
                <span key={flag} className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {onCreateCase && (
            <button
              onClick={() => onCreateCase(device.id)}
              className="text-xs bg-zamtel-green text-white px-2.5 py-1.5 rounded-lg hover:bg-zamtel-green-dark whitespace-nowrap"
            >
              Create Case
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(device.id)}
              className="text-xs bg-white text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
