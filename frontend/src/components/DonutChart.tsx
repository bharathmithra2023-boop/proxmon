interface Props {
  pct: number;
  label: string;
  sublabel: string;
  color?: string;
}

export default function DonutChart({ pct, label, sublabel, color = "var(--accent)" }: Props) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(pct, 100) / 100) * circ;
  const strokeColor = pct > 85 ? "var(--danger)" : pct > 65 ? "var(--warning)" : color;

  return (
    <div className="donut-wrapper">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="7"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x="36" y="40" textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700">
          {Math.round(pct)}%
        </text>
      </svg>
      <div className="donut-info">
        <div className="donut-label" style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{label}</div>
        <div className="donut-label">{sublabel}</div>
      </div>
    </div>
  );
}
