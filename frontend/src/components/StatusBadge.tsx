interface Props {
  status: "running" | "stopped" | "paused" | string;
}

const labels: Record<string, string> = {
  running: "Running",
  stopped: "Stopped",
  paused: "Paused",
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`status-badge ${status}`}>
      <span className="dot" />
      {labels[status] ?? status}
    </span>
  );
}
