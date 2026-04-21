import { DeviceStatus } from '../types';

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  IN_STOCK: { label: 'In Stock', className: 'bg-gray-100 text-gray-700' },
  IN_TRANSIT: { label: 'In Transit', className: 'bg-blue-100 text-blue-700' },
  ASSIGNED: { label: 'Assigned', className: 'bg-purple-100 text-purple-700' },
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Inactive', className: 'bg-yellow-100 text-yellow-700' },
  LOST: { label: 'Lost', className: 'bg-red-100 text-red-700' },
  STOLEN: { label: 'Stolen', className: 'bg-red-200 text-red-800' },
  DAMAGED: { label: 'Damaged', className: 'bg-orange-100 text-orange-700' },
  RETURNED: { label: 'Returned', className: 'bg-teal-100 text-teal-700' },
  WRITTEN_OFF: { label: 'Written Off', className: 'bg-gray-200 text-gray-600' },
};

interface Props {
  status: DeviceStatus | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status as DeviceStatus] || { label: status, className: 'bg-gray-100 text-gray-600' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
