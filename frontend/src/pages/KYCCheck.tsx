import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface DeviceResult {
  id: string;
  imei: string;
  assetTag: string;
  model: string;
  status: string;
  msisdn: string | null;
  province: string | null;
  zone: string | null;
  route: string | null;
  batchId: string | null;
  riskScore: number;
  lastActivityAt: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:   { bg: 'bg-green-100',  text: 'text-green-800',  label: '✅ ACTIVE' },
  INACTIVE: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⚠️ INACTIVE' },
  RETURNED: { bg: 'bg-gray-100',   text: 'text-gray-700',   label: '↩️ RETURNED' },
  LOST:     { bg: 'bg-red-100',    text: 'text-red-800',    label: '🚨 LOST' },
  STOLEN:   { bg: 'bg-red-200',    text: 'text-red-900',    label: '🚨 STOLEN' },
  DAMAGED:  { bg: 'bg-orange-100', text: 'text-orange-800', label: '⚡ DAMAGED' },
};

export default function KYCCheck() {
  const { token } = useSelector((state: RootState) => state.auth);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DeviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Array<{ query: string; status: string; model: string }>>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(
        `${API_URL}/devices/kyc?q=${encodeURIComponent(query.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 404) {
        setError('Device not found. Check the IMEI or Dealer Code and try again.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setResult(data);
      setHistory(prev => [{ query: query.trim(), status: data.status, model: data.model }, ...prev.slice(0, 9)]);
    } catch {
      setError('Failed to look up device. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQuery('');
    setResult(null);
    setError('');
  }

  const statusStyle = result ? (STATUS_COLORS[result.status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: result.status }) : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔍 KYC Device Check</h1>
        <p className="text-sm text-gray-500 mt-1">Enter IMEI or Dealer Code to verify device status</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="IMEI or Dealer Code (e.g. LSK001001)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoComplete="off"
            inputMode="text"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-green-700 text-white px-5 py-3 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-green-800 transition"
          >
            {loading ? '...' : 'Check'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Result Card */}
      {result && statusStyle && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Status Banner */}
          <div className={`${statusStyle.bg} px-5 py-4 flex items-center justify-between`}>
            <span className={`text-lg font-bold ${statusStyle.text}`}>{statusStyle.label}</span>
            <span className="text-xs text-gray-500">{result.assetTag}</span>
          </div>

          {/* Device Info */}
          <div className="px-5 py-4 space-y-3">
            <Row label="Model" value={result.model} />
            <Row label="IMEI" value={result.imei} mono />
            <Row label="MSISDN" value={result.msisdn || '—'} />
            <Row label="Site ID" value={result.batchId || '—'} />
            <Row label="Region" value={result.province || '—'} />
            <Row label="ASE/Zone" value={result.zone || '—'} />
            <Row label="Team Lead" value={result.route || '—'} />
            <Row label="Risk Score" value={
              <span className={`font-semibold ${result.riskScore >= 70 ? 'text-red-600' : result.riskScore >= 40 ? 'text-yellow-600' : 'text-green-700'}`}>
                {result.riskScore}/100
              </span>
            } />
            {result.lastActivityAt && (
              <Row label="Last Activity" value={new Date(result.lastActivityAt).toLocaleDateString('en-ZM')} />
            )}
          </div>

          {/* Actions */}
          <div className="px-5 pb-4 flex gap-2">
            <button
              onClick={clear}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              New Search
            </button>
            {(result.status === 'LOST' || result.status === 'STOLEN' || result.riskScore >= 70) && (
              <span className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm text-center font-semibold">
                🚨 Flag for Audit
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Lookups */}
      {history.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">Recent Checks</h2>
          <div className="space-y-1">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setQuery(h.query)}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 text-sm transition"
              >
                <span className="font-mono text-gray-700">{h.query}</span>
                <span className={`text-xs font-semibold ${STATUS_COLORS[h.status]?.text || 'text-gray-600'}`}>
                  {h.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className={`text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
