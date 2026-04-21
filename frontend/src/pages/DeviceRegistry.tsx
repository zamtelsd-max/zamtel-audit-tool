import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetDevicesQuery } from '../store/api';
import { Device } from '../types';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import { formatDistanceToNow } from 'date-fns';

type FilterChip = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOST' | 'HIGH_RISK';

export default function DeviceRegistry() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterChip>('ALL');
  const [page, setPage] = useState(1);

  const queryParams: Record<string, unknown> = { page, limit: 20 };
  if (search) queryParams.search = search;
  if (filter === 'ACTIVE') queryParams.status = 'ACTIVE';
  else if (filter === 'INACTIVE') queryParams.status = 'INACTIVE';
  else if (filter === 'LOST') queryParams.status = 'LOST';
  else if (filter === 'HIGH_RISK') queryParams.riskMin = 70;

  const { data, isLoading } = useGetDevicesQuery(queryParams as Parameters<typeof useGetDevicesQuery>[0]);

  const chips: { key: FilterChip; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'INACTIVE', label: 'Inactive' },
    { key: 'LOST', label: 'Lost' },
    { key: 'HIGH_RISK', label: 'High Risk' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Registry</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.pagination.total || 0} devices total
          </p>
        </div>
        <button
          onClick={() => navigate('/bulk-import')}
          className="btn-primary text-sm"
        >
          + Bulk Import
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by IMEI, Asset Tag, MSISDN, or custodian name..."
          className="input pl-10"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => { setFilter(chip.key); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === chip.key
                ? 'bg-zamtel-green text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zamtel-green"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['IMEI', 'Asset Tag', 'Model', 'Status', 'Custodian', 'Province', 'Risk', 'Last Activity'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data?.devices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      No devices found
                    </td>
                  </tr>
                ) : (
                  data?.devices.map((device: Device) => (
                    <tr
                      key={device.id}
                      onClick={() => navigate(`/devices/${device.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-800">{device.imei}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{device.assetTag}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{device.model}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={device.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {device.custodian?.name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{device.province || '—'}</td>
                      <td className="px-4 py-3">
                        <RiskBadge score={device.riskScore} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {device.lastActivityAt
                          ? formatDistanceToNow(new Date(device.lastActivityAt), { addSuffix: true })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
