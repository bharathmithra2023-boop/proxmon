import { useState } from "react";
import { actionApi } from "../api/client";
import type { VMStatus } from "../api/client";
import { formatBytes, formatUptime, cpuPct, memPct, diskPct } from "../lib/format";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  vm: VMStatus;
  onClick: () => void;
  onAction: (msg: string, type: "success" | "error") => void;
  readOnly?: boolean;
  ip?: string;
  diskUsage?: { used: number; total: number };
}

type Action = "start" | "stop" | "reboot" | "shutdown";

interface PendingAction {
  action: Action;
  label: string;
  icon: string;
}

function MiniBar({ value, type }: { value: number; type: "cpu" | "mem" | "disk" }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const overrideColor = pct > 85 ? "var(--danger)" : pct > 65 ? "var(--warning)" : undefined;
  return (
    <div className="vm-metric-bar">
      <div
        className={`vm-metric-fill ${type}`}
        style={{
          width: `${pct}%`,
          background: overrideColor
            ? `linear-gradient(90deg, ${overrideColor}, ${overrideColor}cc)`
            : undefined,
        }}
      />
    </div>
  );
}

export default function VMCard({ vm, onClick, onAction, readOnly, ip, diskUsage }: Props) {
  const [loading, setLoading] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);

  const cpuVal  = cpuPct(vm.cpu ?? 0);
  const memVal  = memPct(vm.mem ?? 0, vm.maxmem ?? 1);
  const diskUsed  = diskUsage?.used ?? vm.disk ?? 0;
  const diskTotal = diskUsage?.total ?? vm.maxdisk ?? 0;
  const diskVal = diskPct(diskUsed, diskTotal);

  const isRunning = vm.status === "running";
  const isStopped = vm.status === "stopped";
  const isLocked  = !!vm.lock;

  const doAction = async (action: Action) => {
    setConfirm(null);
    setLoading(action);
    try {
      await actionApi[action](vm.type, vm.vmid);
      onAction(`${vm.name}: ${action} command sent`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || err.message
        : "Unknown error";
      onAction(msg, "error");
    } finally {
      setLoading(null);
    }
  };

  const askConfirm = (action: Action, label: string, icon: string) =>
    setConfirm({ action, label, icon });

  return (
    <>
      <div className={`vm-card ${vm.status}`} onClick={onClick}>

        {/* ── Header ── */}
        <div className="vm-card-header">
          <div style={{ minWidth: 0 }}>
            <div className="vm-name">{vm.name || `VM ${vm.vmid}`}</div>
            <div className="vm-id">
              <span>#{vm.vmid}</span>
              <span className="vm-type-badge">{vm.type.toUpperCase()}</span>
              {ip && (
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>{ip}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 8 }}>
            <StatusBadge status={vm.status} />
            {isLocked && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--warning)", background: "rgba(245,158,11,0.12)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>
                🔒 LOCKED
              </span>
            )}
          </div>
        </div>

        {/* ── Metrics (running only) ── */}
        {isRunning && (
          <div className="vm-metrics">
            <div className="vm-metric-col">
              <div className="vm-metric-label">CPU</div>
              <div className="vm-metric-value">{cpuVal.toFixed(1)}%</div>
              <MiniBar value={cpuVal} type="cpu" />
            </div>
            <div className="vm-metric-col">
              <div className="vm-metric-label">Memory</div>
              <div className="vm-metric-value" title={`${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}`}>
                {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
              </div>
              <MiniBar value={memVal} type="mem" />
            </div>
            <div className="vm-metric-col">
              <div className="vm-metric-label">Disk</div>
              <div className="vm-metric-value" title={diskTotal > 0 ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}` : `${formatBytes(vm.maxdisk)} alloc`}>
                {diskTotal > 0 ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}` : `${formatBytes(vm.maxdisk)}`}
              </div>
              <MiniBar value={diskVal} type="disk" />
            </div>
          </div>
        )}

        {isStopped && (
          <div className="vm-metrics">
            <div className="vm-metric-col" style={{ gridColumn: "1 / -1", borderRight: "none" }}>
              <div className="vm-metric-label">Disk</div>
              <div className="vm-metric-value">
                {diskTotal > 0 ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}` : `${formatBytes(vm.maxdisk)} allocated`}
              </div>
              <MiniBar value={diskVal} type="disk" />
            </div>
          </div>
        )}

        {/* ── Footer: uptime + actions ── */}
        <div className="vm-card-footer" onClick={(e) => e.stopPropagation()}>
          <div className="vm-uptime-chip">
            {isRunning && <><span style={{ color: "var(--success)", fontSize: 9 }}>●</span> {formatUptime(vm.uptime)}</>}
            {isStopped && <span style={{ color: "var(--text-muted)" }}>Stopped</span>}
            {vm.status === "paused" && <span style={{ color: "var(--paused)" }}>Paused</span>}
          </div>

          {!readOnly && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {isLocked && (
                <span style={{ fontSize: 11, color: "var(--warning)", alignSelf: "center" }}>🔒 Locked</span>
              )}
              {!isLocked && isStopped && (
                <button className="btn btn-success btn-sm" onClick={() => doAction("start")} disabled={!!loading}>
                  {loading === "start" ? <span className="spinner" style={{ width: 11, height: 11 }} /> : "▶ Start"}
                </button>
              )}
              {!isLocked && isRunning && (
                <>
                  <button className="btn btn-warning btn-sm" onClick={() => askConfirm("reboot", "Reboot", "🔄")} disabled={!!loading}>
                    {loading === "reboot" ? <span className="spinner" style={{ width: 11, height: 11 }} /> : "↺ Reboot"}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => askConfirm("shutdown", "Shutdown", "⏻")} disabled={!!loading}>
                    {loading === "shutdown" ? <span className="spinner" style={{ width: 11, height: 11 }} /> : "⏻ Shutdown"}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => askConfirm("stop", "Force Stop", "⬛")} disabled={!!loading}>
                    {loading === "stop" ? <span className="spinner" style={{ width: 11, height: 11 }} /> : "⬛ Stop"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={`${confirm.label} VM`}
          icon={confirm.icon}
          message={
            <>
              Are you sure you want to <strong>{confirm.label.toLowerCase()}</strong>{" "}
              <strong>{vm.name}</strong>?
              {confirm.action === "stop" && (
                <><br /><span style={{ color: "var(--danger)", fontSize: 12 }}>⚠ Force stop may cause data loss.</span></>
              )}
            </>
          }
          confirmLabel={confirm.label}
          confirmClass={`btn ${confirm.action === "reboot" ? "btn-warning" : confirm.action === "stop" ? "btn-danger" : "btn-ghost"}`}
          onConfirm={() => doAction(confirm.action)}
          onCancel={() => setConfirm(null)}
          loading={!!loading}
        />
      )}
    </>
  );
}
