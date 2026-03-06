import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { vmApi, actionApi } from "../api/client";
import type { VMStatus } from "../api/client";
import { formatBytes, formatUptime, cpuPct, memPct } from "../lib/format";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

interface Props {
  vm: VMStatus;
  onBack: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
  userRole?: string;
}

interface RRDPoint {
  time: number;
  cpu?: number;
  mem?: number;
  netin?: number;
  netout?: number;
  diskread?: number;
  diskwrite?: number;
}

type Action = "start" | "stop" | "reboot" | "shutdown";
type Timeframe = "hour" | "day" | "week";

const TooltipContent = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function VMDetail({ vm, onBack, onToast, userRole }: Props) {
  const [rrd, setRRD] = useState<RRDPoint[]>([]);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [timeframe, setTimeframe] = useState<Timeframe>("hour");
  const [loadingRRD, setLoadingRRD] = useState(true);
  const [loadingAction, setLoadingAction] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<{ action: Action; label: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingRRD(true);
      try {
        const [rrdData, cfgData] = await Promise.all([
          vmApi.getRRD(vm.type, vm.vmid, timeframe),
          vmApi.getConfig(vm.type, vm.vmid),
        ]);
        setRRD(rrdData || []);
        setConfig(cfgData || {});
      } catch {
        setRRD([]);
      } finally {
        setLoadingRRD(false);
      }
    };
    load();
  }, [vm.vmid, vm.type, timeframe]);

  const doAction = async (action: Action) => {
    setConfirm(null);
    setLoadingAction(action);
    try {
      await actionApi[action](vm.type, vm.vmid);
      onToast(`${vm.name}: ${action} command sent`, "success");
    } catch {
      onToast(`Failed to ${action} ${vm.name}`, "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const fmtTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return timeframe === "hour"
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const chartData = rrd
    .filter((p) => p.time)
    .map((p) => ({
      time: fmtTime(p.time),
      "CPU %": p.cpu ? +(p.cpu * 100).toFixed(2) : 0,
      "Mem (MB)": p.mem ? +(p.mem / 1024 / 1024).toFixed(0) : 0,
      "Net In (KB/s)": p.netin ? +(p.netin / 1024).toFixed(1) : 0,
      "Net Out (KB/s)": p.netout ? +(p.netout / 1024).toFixed(1) : 0,
    }));

  const isRunning = vm.status === "running";
  const isStopped = vm.status === "stopped";

  const configRows: [string, string][] = Object.entries(config)
    .filter(([k]) => ["cores", "memory", "name", "ostype", "scsihw", "net0", "scsi0", "boot", "agent"].includes(k))
    .map(([k, v]) => [k, String(v)]);

  return (
    <>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div>
          <div className="page-title">{vm.name || `VM ${vm.vmid}`}</div>
          <div className="page-subtitle">
            ID: {vm.vmid} · {vm.type.toUpperCase()} · <StatusBadge status={vm.status} />
          </div>
        </div>
        {userRole !== "viewer" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {isStopped && (
              <button className="btn btn-success" onClick={() => doAction("start")} disabled={!!loadingAction}>
                {loadingAction === "start" ? <span className="spinner" /> : "▶ Start"}
              </button>
            )}
            {isRunning && (
              <>
                <button className="btn btn-warning" onClick={() => setConfirm({ action: "reboot", label: "Reboot" })} disabled={!!loadingAction}>
                  {loadingAction === "reboot" ? <span className="spinner" /> : "↺ Reboot"}
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirm({ action: "shutdown", label: "Shutdown" })} disabled={!!loadingAction}>
                  {loadingAction === "shutdown" ? <span className="spinner" /> : "⏻ Shutdown"}
                </button>
                <button className="btn btn-danger" onClick={() => setConfirm({ action: "stop", label: "Force Stop" })} disabled={!!loadingAction}>
                  {loadingAction === "stop" ? <span className="spinner" /> : "⬛ Stop"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="detail-grid">
        {/* Left: Charts */}
        <div>
          {/* Timeframe selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["hour", "day", "week"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                className={`btn btn-sm ${timeframe === tf ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>

          {loadingRRD ? (
            <div className="loading-screen" style={{ height: 200 }}>
              <span className="spinner" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              No historical data available
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="chart-title">CPU Usage (%)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip content={<TooltipContent />} />
                    <Line type="monotone" dataKey="CPU %" stroke="var(--accent)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="chart-title">Memory Usage (MB)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                    <Tooltip content={<TooltipContent />} />
                    <Line type="monotone" dataKey="Mem (MB)" stroke="var(--success)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="chart-title">Network I/O (KB/s)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                    <Tooltip content={<TooltipContent />} />
                    <Line type="monotone" dataKey="Net In (KB/s)" stroke="#06b6d4" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="Net Out (KB/s)" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Right: Info */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="chart-title">Live Status</div>
            {isRunning ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>CPU</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
                    {cpuPct(vm.cpu).toFixed(1)}%
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Memory</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatBytes(vm.mem)}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>of {formatBytes(vm.maxmem)} ({memPct(vm.mem, vm.maxmem).toFixed(1)}%)</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Disk</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatBytes(vm.disk)}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>of {formatBytes(vm.maxdisk)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Uptime</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatUptime(vm.uptime)}</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Network</div>
                  <div style={{ fontSize: 13 }}>▼ {formatBytes(vm.netin)} in</div>
                  <div style={{ fontSize: 13 }}>▲ {formatBytes(vm.netout)} out</div>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>VM is not running</div>
            )}
          </div>

          <div className="card">
            <div className="chart-title">Configuration</div>
            {configRows.length > 0 ? (
              <table className="config-table">
                <tbody>
                  {configRows.map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td style={{ wordBreak: "break-all" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No config data</div>
            )}
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={`${confirm.label} VM`}
          icon={confirm.action === "reboot" ? "🔄" : confirm.action === "shutdown" ? "⏻" : "⬛"}
          message={
            <>
              Are you sure you want to <strong>{confirm.label.toLowerCase()}</strong>{" "}
              <strong>{vm.name}</strong>?
            </>
          }
          confirmLabel={confirm.label}
          confirmClass={`btn ${confirm.action === "reboot" ? "btn-warning" : confirm.action === "stop" ? "btn-danger" : "btn-ghost"}`}
          onConfirm={() => doAction(confirm.action)}
          onCancel={() => setConfirm(null)}
          loading={!!loadingAction}
        />
      )}
    </>
  );
}
