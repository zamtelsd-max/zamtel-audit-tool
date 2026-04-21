import { useState } from 'react';
import { useGetProductivityReportQuery, useGetLostStolenReportQuery, useGetRiskWatchlistQuery } from '../store/api';
import { Download, BarChart2, AlertTriangle, ShieldAlert, TrendingUp } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import type { Device } from '../types';

type Tab = 'productivity' | 'lost-stolen' | 'risk-watchlist';

interface ProductivityRow {
  device: Device;
  avgDailyRegistrations: number;
  totalRegistrations: number;
  daysActive: number;
  lastActivity?: string;
}

function downloadCSV(data: object[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify((row as Record<string,unknown>)[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>('productivity');

  const { data: productivity, isLoading: loadProd } = useGetProductivityReportQuery();
  const { data: lostStolen, isLoading: loadLS }     = useGetLostStolenReportQuery();
  const { data: riskList, isLoading: loadRisk }     = useGetRiskWatchlistQuery();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'productivity',  label: 'Productivity',   icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'lost-stolen',   label: 'Lost / Stolen',  icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'risk-watchlist',label: 'Risk Watchlist', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-green-700" /> Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Operational intelligence &amp; device accountability</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition ${tab === t.id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Productivity Report ── */}
      {tab === 'productivity' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Device Productivity Ranking</h2>
            <button onClick={() => productivity && downloadCSV(
              (productivity as ProductivityRow[]).map(r => ({
                IMEI: r.device.imei, AssetTag: r.device.assetTag, Model: r.device.model,
                Custodian: r.device.custodian?.name || '', Province: r.device.province || '',
                AvgDaily: r.avgDailyRegistrations, Total: r.totalRegistrations,
                DaysActive: r.daysActive, LastActivity: r.lastActivity || '',
              })), 'productivity-report.csv'
            )} className="flex items-center gap-1.5 text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition">
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadProd ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : !(productivity as ProductivityRow[])?.length ? (
              <div className="p-12 text-center text-gray-400">No productivity data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['#','IMEI / Asset Tag','Model','Custodian','Province','Avg/Day','Total Regs','Days Active','Last Activity','Risk'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(productivity as ProductivityRow[]).map((row, i) => (
                      <tr key={row.device.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-gray-800">{row.device.imei}</p>
                          <p className="text-xs text-gray-400">{row.device.assetTag}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{row.device.model}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{row.device.custodian?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{row.device.province || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${row.avgDailyRegistrations >= 10 ? 'text-green-700' : row.avgDailyRegistrations >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {row.avgDailyRegistrations.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-semibold text-sm">{row.totalRegistrations}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{row.daysActive}d</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {row.lastActivity ? format(new Date(row.lastActivity), 'dd MMM') : '—'}
                        </td>
                        <td className="px-4 py-3"><RiskBadge score={row.device.riskScore} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Lost / Stolen Report ── */}
      {tab === 'lost-stolen' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Lost & Stolen Devices</h2>
              <p className="text-xs text-gray-500 mt-0.5">{lostStolen?.length ?? 0} devices requiring recovery action</p>
            </div>
            <button onClick={() => lostStolen && downloadCSV(
              lostStolen.map(d => ({
                IMEI: d.imei, AssetTag: d.assetTag, Model: d.model, Status: d.status,
                LastCustodian: d.custodian?.name || '', Province: d.province || '',
                Zone: d.zone || '', LastActivity: d.lastActivityAt || '', RiskScore: d.riskScore,
              })), 'lost-stolen-report.csv'
            )} className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition">
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadLS ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : !lostStolen?.length ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500 font-medium">No lost or stolen devices</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 border-b border-red-100">
                    <tr>
                      {['IMEI','Asset Tag','Model','Status','Last Custodian','Province','Zone','Last Activity','Risk Score'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-red-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lostStolen.map(d => (
                      <tr key={d.id} className="hover:bg-red-50/30">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{d.imei}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{d.assetTag}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{d.model}</td>
                        <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-700">{d.custodian?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{d.province || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{d.zone || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {d.lastActivityAt ? format(new Date(d.lastActivityAt), 'dd MMM yyyy') : 'Never'}
                        </td>
                        <td className="px-4 py-3"><RiskBadge score={d.riskScore} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Risk Watchlist ── */}
      {tab === 'risk-watchlist' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">High-Risk Device Watchlist</h2>
              <p className="text-xs text-gray-500 mt-0.5">Top 50 highest-risk devices — sorted by risk score</p>
            </div>
            <button onClick={() => riskList && downloadCSV(
              riskList.map(d => ({
                IMEI: d.imei, AssetTag: d.assetTag, Model: d.model, RiskScore: d.riskScore,
                RiskFlags: d.riskFlags.join('; '), Custodian: d.custodian?.name || '',
                Province: d.province || '', Zone: d.zone || '', Status: d.status,
              })), 'risk-watchlist.csv'
            )} className="flex items-center gap-1.5 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition">
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadRisk ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : !riskList?.length ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">🛡️</div>
                <p className="text-gray-500 font-medium">No high-risk devices</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50 border-b border-orange-100">
                    <tr>
                      {['#','IMEI','Asset Tag','Risk Score','Risk Flags','Custodian','Province','Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {riskList.map((d, i) => (
                      <tr key={d.id} className="hover:bg-orange-50/30">
                        <td className="px-4 py-3 text-gray-400 text-xs font-bold">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{d.imei}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{d.assetTag}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${d.riskScore >= 80 ? 'bg-red-500' : d.riskScore >= 60 ? 'bg-orange-400' : 'bg-yellow-400'}`}
                                style={{ width: `${d.riskScore}%` }} />
                            </div>
                            <RiskBadge score={d.riskScore} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.riskFlags.map(f => (
                              <span key={f} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">{f}</span>
                            ))}
                            {!d.riskFlags.length && <span className="text-xs text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{d.custodian?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{d.province || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
