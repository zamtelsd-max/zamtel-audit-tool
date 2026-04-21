import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ActivityLog } from '../types';
import { format } from 'date-fns';

interface Props {
  activities: ActivityLog[];
}

export default function ActivityChart({ activities }: Props) {
  const data = activities.map((a) => ({
    date: format(new Date(a.date), 'dd MMM'),
    registrations: a.totalRegistrations,
    offHours: a.offHoursCount,
  }));

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No activity data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value, name) => [value, name === 'registrations' ? 'Registrations' : 'Off-Hours']}
        />
        <Bar dataKey="registrations" fill="#00843D" radius={[2, 2, 0, 0]} />
        <Bar dataKey="offHours" fill="#E4007C" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
