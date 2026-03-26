import { useState, useEffect } from "react";
import { auditApi } from "../api/client";
import type { AuditEntry } from "../api/client";

interface Props {
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

const actionColors: Record<string, string> = {
  start:    "var(--success)",
  stop:     "var(--danger)",
  shutdown: "var(--warning)",
  reboot:   "var(--warning)",
  create:   "var(--accent)",
  clone:    "var(--accent)",
  lock:     "#8b5cf6",
  unlock:   "#8b5cf6",
  remove:   "var(--danger)",
};

export default function AuditLog({ onToast }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    auditApi.getLog(500)
      .then((data) => setEntries(data))
      .catch(() => onToast("Failed to load audit log", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? entries.filter((e) =>
        e.username.includes(filter) ||
        e.action.includes(filter) ||
        e.target.includes(filter)
      )
    : entries;

  const fmtDate = (ts: string) => new Date(ts).toLocaleString();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">Audit Log</div>
        <div className="page-subtitle">Record of all VM actions performed by users</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by user, action, or target..."
          style={{ width: 300, padding: "8px 12px", fontSize: 13 }}
        />
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {loading ? (
        <div className="loading-screen"><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          {filter ? "No entries match the filter." : "No audit log entries yet."}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Time", "User", "Action", "Target", "Result", "Detail"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontSize: 11, color: "var(--text-muted)", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice().reverse().map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "9px 14px", whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>
                    {fmtDate(e.timestamp)}
                  </td>
                  <td style={{ padding: "9px 14px", fontWeight: 600 }}>{e.username}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: `color-mix(in srgb, ${actionColors[e.action] || "var(--text-muted)"} 15%, transparent)`,
                      color: actionColors[e.action] || "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      {e.action}
                    </span>
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 12 }}>{e.target}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: e.result === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: e.result === "success" ? "var(--success)" : "var(--danger)",
                    }}>
                      {e.result}
                    </span>
                  </td>
                  <td style={{ padding: "9px 14px", color: "var(--text-muted)", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.detail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
