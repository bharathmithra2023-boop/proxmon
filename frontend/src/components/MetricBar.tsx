interface Props {
  label: string;
  value: number; // percentage 0-100
  display: string;
  type?: "cpu" | "mem" | "disk";
}

export default function MetricBar({ label, value, display, type = "cpu" }: Props) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = pct > 85 ? "var(--danger)" : pct > 65 ? "var(--warning)" : undefined;

  return (
    <div className="metric-row">
      <div className="metric-header">
        <span>{label}</span>
        <span style={color ? { color } : undefined}>{display}</span>
      </div>
      <div className="metric-bar">
        <div
          className={`metric-fill ${type}`}
          style={{
            width: `${pct}%`,
            background: color
              ? `linear-gradient(90deg, ${color}, ${color}aa)`
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
