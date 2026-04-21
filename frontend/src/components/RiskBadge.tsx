interface Props {
  score: number;
  showLabel?: boolean;
}

function getRiskConfig(score: number) {
  if (score <= 30) return { color: 'text-green-600', bg: 'bg-green-100', ring: 'ring-green-400', label: 'Low' };
  if (score <= 60) return { color: 'text-yellow-600', bg: 'bg-yellow-100', ring: 'ring-yellow-400', label: 'Medium' };
  if (score <= 80) return { color: 'text-orange-600', bg: 'bg-orange-100', ring: 'ring-orange-400', label: 'High' };
  return { color: 'text-red-600', bg: 'bg-red-100', ring: 'ring-red-500', label: 'Critical' };
}

export default function RiskBadge({ score, showLabel = false }: Props) {
  const config = getRiskConfig(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${config.bg} ${config.color} ${config.ring}`}>
      {score}
      {showLabel && <span className="text-xs font-normal">({config.label})</span>}
    </span>
  );
}
