import { useState } from "react";
import { actionApi } from "../api/client";
import type { VMStatus } from "../api/client";
import { formatBytes, formatUptime, cpuPct, memPct } from "../lib/format";
import StatusBadge from "./StatusBadge";
import MetricBar from "./MetricBar";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  vm: VMStatus;
  onClick: () => void;
  onAction: (msg: string, type: "success" | "error") => void;
  readOnly?: boolean;
}

type Action = "start" | "stop" | "reboot" | "shutdown";

interface PendingAction {
  action: Action;
  label: string;
  icon: string;
}

export default function VMCard({ vm, onClick, onAction, readOnly }: Props) {
  const [loading, setLoading] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);

  const cpuVal = cpuPct(vm.cpu ?? 0);
  const memVal = memPct(vm.mem ?? 0, vm.maxmem ?? 1);

  const doAction = async (action: Action) => {
    setConfirm(null);
    setLoading(action);
    try {
      const fn = actionApi[action];
      await fn(vm.type, vm.vmid);
      onAction(`${vm.name}: ${action} command sent`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || err.message : "Unknown error";
      onAction(msg, "error");
    } finally {
      setLoading(null);
    }
  };

  const askConfirm = (action: Action, label: string, icon: string) => {
    setConfirm({ action, label, icon });
  };

  const isRunning = vm.status === "running";
  const isStopped = vm.status === "stopped";
  const isLocked = !!vm.lock;

  return (
    <>
      <div className={`vm-card ${vm.status}`} onClick={onClick}>
        <div className="vm-card-header">
          <div>
            <div className="vm-name">{vm.name || `VM ${vm.vmid}`}</div>
            <div className="vm-id">ID: {vm.vmid} · <span className="vm-type-badge">{vm.type.toUpperCase()}</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <StatusBadge status={vm.status} />
            {isLocked && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--warning)", background: "rgba(245,158,11,0.12)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>
                🔒 LOCKED
              </span>
            )}
          </div>
        </div>

        {isRunning && (
          <>
            <MetricBar
              label="CPU"
              value={cpuVal}
              display={`${cpuVal.toFixed(1)}%`}
              type="cpu"
            />
            <MetricBar
              label="Memory"
              value={memVal}
              display={`${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}`}
              type="mem"
            />
            <div className="uptime-text">Uptime: {formatUptime(vm.uptime)}</div>
          </>
        )}

        {isStopped && (
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>
            Disk: {formatBytes(vm.maxdisk)}
          </div>
        )}

        {!readOnly && <div className="vm-actions" onClick={(e) => e.stopPropagation()}>
          {isLocked && (
            <span style={{ fontSize: 11, color: "var(--warning)", alignSelf: "center" }}>🔒 Unlock to perform actions</span>
          )}
          {!isLocked && isStopped && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => doAction("start")}
              disabled={!!loading}
            >
              {loading === "start" ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "▶ Start"}
            </button>
          )}
          {!isLocked && isRunning && (
            <>
              <button
                className="btn btn-warning btn-sm"
                onClick={() => askConfirm("reboot", "Reboot", "🔄")}
                disabled={!!loading}
              >
                {loading === "reboot" ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "↺ Reboot"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => askConfirm("shutdown", "Shutdown", "⏻")}
                disabled={!!loading}
              >
                {loading === "shutdown" ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "⏻ Shutdown"}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => askConfirm("stop", "Force Stop", "⬛")}
                disabled={!!loading}
              >
                {loading === "stop" ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "⬛ Stop"}
              </button>
            </>
          )}
        </div>}
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
