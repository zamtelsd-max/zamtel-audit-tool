import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useGetExecutiveDashboardQuery } from '../store/api';

const KPI_COLORS = ['#00843D', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#10B981', '#F97316'];

interface KPICard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  link?: string;
}

export default function ExecutiveDashboard() {
  const { data, isLoading, error } = useGetExecutiveDashboardQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zamtel-green"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card text-center py-12 text-gray-500">
        <p>Failed to load dashboard data</p>
        <button className="btn-primary mt-4 text-sm" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const kpis: KPICard[] = [
    { label: 'Total Fleet', value: data.totalDevices, icon: '📱', color: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: data.active, icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'Inactive', value: data.inactive, icon: '⏸️', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Lost + Stolen', value: data.lost + data.stolen, icon: '🚨', color: 'bg-red-50 text-red-700' },
    { label: 'High Risk', value: data.highRisk, icon: '⚠️', color: 'bg-orange-50 text-orange-700' },
    { label: 'Avg Productivity', value: `${data.avgProductivity}/day`, icon: '📈', color: 'bg-teal-50 text-teal-700' },
    { label: 'Open Cases', value: data.openCases, icon: '📋', color: 'bg-purple-50 text-purple-700', link: '/cases' },
    { label: 'Pending Acks', value: data.pendingAcknowledgements, icon: '⏳', color: 'bg-pink-50 text-pink-700' },
  ];

  const pieData = Object.entries(data.byStatus).map(([name, value]) => ({ name, value }));
  const barData = data.byProvince
    .filter((p) => p.province)
    .map((p) => ({ province: p.province || 'Unknown', devices: p.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Fleet overview and performance metrics</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`card cursor-pointer hover:shadow-md transition-shadow ${kpi.link ? 'border-zamtel-green/20' : ''}`}
            onClick={() => kpi.link && navigate(kpi.link)}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${kpi.color} text-lg mb-3`}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Status Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={KPI_COLORS[index % KPI_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No data</p>}
        </div>

        {/* Devices by Province */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Devices by Province</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="province" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="devices" fill="#00843D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No data</p>}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/devices', icon: '📱', label: 'View Devices', color: 'bg-zamtel-green text-white' },
          { to: '/cases', icon: '📋', label: 'Audit Cases', color: 'bg-zamtel-pink text-white' },
          { to: '/alerts', icon: '🔔', label: 'Alert Centre', color: 'bg-orange-500 text-white' },
        ].map((link) => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className={`${link.color} rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            <span className="text-2xl">{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
