import type { MetricsPayload } from "../hooks/useWebSocket";
import { formatBytes, formatUptime } from "../lib/format";
import DonutChart from "../components/DonutChart";

interface Props {
  metrics: MetricsPayload | null;
}

export default function Dashboard({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="loading-screen">
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <span>Connecting to Proxmox…</span>
      </div>
    );
  }

  const { vms, nodeStatus } = metrics;

  const running = vms.filter((v) => v.status === "running").length;
  const stopped = vms.filter((v) => v.status === "stopped").length;
  const paused = vms.filter((v) => v.status === "paused").length;

  const totalCPU = vms.filter((v) => v.status === "running").reduce((a, v) => a + (v.cpu || 0), 0);
  const totalMem = vms.filter((v) => v.status === "running").reduce((a, v) => a + (v.mem || 0), 0);

  const nodeCpuPct = (nodeStatus.cpu || 0) * 100;
  const nodeMemPct = nodeStatus.memory
    ? (nodeStatus.memory.used / nodeStatus.memory.total) * 100
    : 0;
  const nodeDiskPct = nodeStatus.rootfs
    ? (nodeStatus.rootfs.used / nodeStatus.rootfs.total) * 100
    : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            {nodeStatus.pveversion ? `Proxmox VE ${nodeStatus.pveversion}` : "Proxmox VE"} ·
            Uptime: {formatUptime(nodeStatus.uptime)}
          </div>
        </div>
      </div>

      {/* Host Metrics */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
        Host Node
      </div>
      <div className="host-panel" style={{ marginBottom: 24 }}>
        <div className="host-metric">
          <div className="host-metric-title">CPU Usage</div>
          <DonutChart
            pct={nodeCpuPct}
            label={`${nodeCpuPct.toFixed(1)}%`}
            sublabel={nodeStatus.cpuinfo ? `${nodeStatus.cpuinfo.cores} cores · ${nodeStatus.cpuinfo.model?.split(" ").slice(0, 3).join(" ")}` : ""}
            color="var(--accent)"
          />
        </div>
        <div className="host-metric">
          <div className="host-metric-title">Memory Usage</div>
          <DonutChart
            pct={nodeMemPct}
            label={formatBytes(nodeStatus.memory?.used || 0)}
            sublabel={`of ${formatBytes(nodeStatus.memory?.total || 0)}`}
            color="var(--success)"
          />
        </div>
        <div className="host-metric">
          <div className="host-metric-title">Root Filesystem</div>
          <DonutChart
            pct={nodeDiskPct}
            label={formatBytes(nodeStatus.rootfs?.used || 0)}
            sublabel={`of ${formatBytes(nodeStatus.rootfs?.total || 0)}`}
            color="var(--warning)"
          />
        </div>
        <div className="host-metric" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="host-metric-title">Load Average</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {(nodeStatus.loadavg || []).map((v, i) => (
              <div key={i}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{v.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{["1m", "5m", "15m"][i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VM Summary */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
        VM Fleet
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🖥</div>
          <div className="stat-label">Total VMs</div>
          <div className="stat-value">{vms.length}</div>
        </div>
        <div className="stat-card" style={{ borderTop: "2px solid var(--success)" }}>
          <div className="stat-icon">▶</div>
          <div className="stat-label">Running</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{running}</div>
        </div>
        <div className="stat-card" style={{ borderTop: "2px solid var(--text-muted)" }}>
          <div className="stat-icon">⬛</div>
          <div className="stat-label">Stopped</div>
          <div className="stat-value" style={{ color: "var(--text-muted)" }}>{stopped}</div>
        </div>
        {paused > 0 && (
          <div className="stat-card" style={{ borderTop: "2px solid var(--paused)" }}>
            <div className="stat-icon">⏸</div>
            <div className="stat-label">Paused</div>
            <div className="stat-value" style={{ color: "var(--paused)" }}>{paused}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-label">Total CPU Load</div>
          <div className="stat-value">{(totalCPU * 100).toFixed(1)}%</div>
          <div className="stat-sub">across running VMs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-label">Total RAM Used</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatBytes(totalMem)}</div>
          <div className="stat-sub">across running VMs</div>
        </div>
      </div>

      {/* Quick VM list */}
      <div style={{ marginTop: 8, marginBottom: 8, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
        Recent Activity
      </div>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["ID", "Name", "Type", "Status", "CPU", "Memory", "Uptime"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vms.slice(0, 10).map((vm) => (
              <tr key={vm.vmid} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-muted)" }}>{vm.vmid}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{vm.name || `VM ${vm.vmid}`}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="vm-type-badge">{vm.type.toUpperCase()}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span className={`status-badge ${vm.status}`}>
                    <span className="dot" />
                    {vm.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  {vm.status === "running" ? `${(vm.cpu * 100).toFixed(1)}%` : "—"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  {vm.status === "running" ? formatBytes(vm.mem) : "—"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-muted)" }}>
                  {vm.status === "running" ? formatUptime(vm.uptime) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
