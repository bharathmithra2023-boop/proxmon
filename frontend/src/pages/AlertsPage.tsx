import { useState, useEffect } from "react";
import { alertsApi } from "../api/client";
import type { AlertRule, AlertEvent } from "../api/client";

interface Props {
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

const ruleTypeLabels: Record<string, string> = {
  vm_offline: "VM Offline",
  vm_cpu:     "VM CPU High",
  vm_ram:     "VM RAM High",
  node_cpu:   "Node CPU High",
  node_ram:   "Node RAM High",
};

const needsThreshold = (type: string) => ["vm_cpu", "vm_ram", "node_cpu", "node_ram"].includes(type);
const needsVM = (type: string) => ["vm_offline", "vm_cpu", "vm_ram"].includes(type);

export default function AlertsPage({ onToast }: Props) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "vm_offline" as AlertRule["type"],
    vmid: "",
    vmtype: "qemu" as "qemu" | "lxc",
    vmname: "",
    threshold: "80",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([alertsApi.getRules(), alertsApi.getHistory()]);
      setRules(r);
      setHistory(h);
    } catch {
      onToast("Failed to load alerts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createRule = async () => {
    setSaving(true);
    try {
      const payload: Partial<AlertRule> = { type: form.type, enabled: true };
      if (needsVM(form.type)) {
        if (form.vmid) payload.vmid = parseInt(form.vmid);
        payload.vmtype = form.vmtype;
        if (form.vmname) payload.vmname = form.vmname;
      }
      if (needsThreshold(form.type)) payload.threshold = parseFloat(form.threshold);
      await alertsApi.createRule(payload);
      onToast("Alert rule created", "success");
      setShowForm(false);
      setForm({ type: "vm_offline", vmid: "", vmtype: "qemu", vmname: "", threshold: "80" });
      load();
    } catch {
      onToast("Failed to create rule", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    try {
      await alertsApi.updateRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    } catch {
      onToast("Failed to update rule", "error");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await alertsApi.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      onToast("Rule deleted", "success");
    } catch {
      onToast("Failed to delete rule", "error");
    }
  };

  const fmtDate = (ts: string) => new Date(ts).toLocaleString();

  const ruleDesc = (r: AlertRule) => {
    const label = ruleTypeLabels[r.type] || r.type;
    const parts: string[] = [label];
    if (r.vmname) parts.push(`for "${r.vmname}"`);
    else if (r.vmid) parts.push(`for VM ${r.vmid}${r.vmtype ? ` (${r.vmtype})` : ""}`);
    if (r.threshold != null) parts.push(`> ${r.threshold}%`);
    return parts.join(" ");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="page-title">Alerts &amp; Monitoring</div>
          <div className="page-subtitle">Define threshold rules and view alert history</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Rule</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["rules", "history"] as const).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(t)}>
            {t === "rules" ? `Rules (${rules.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-screen"><span className="spinner" /></div>
      ) : tab === "rules" ? (
        rules.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            No alert rules defined. Create one to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rules.map((r) => (
              <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                <div
                  onClick={() => toggleRule(r)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                    background: r.enabled ? "var(--accent)" : "var(--border-strong)",
                    position: "relative", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: r.enabled ? 19 : 3,
                    width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ruleDesc(r)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Created {fmtDate(r.createdAt)} · {r.enabled ? "Active" : "Disabled"}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                  background: r.enabled ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                  color: r.enabled ? "var(--success)" : "var(--text-muted)",
                }}>
                  {r.enabled ? "ON" : "OFF"}
                </span>
                <button className="btn btn-danger btn-sm" onClick={() => deleteRule(r.id)}>Delete</button>
              </div>
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            No alert events recorded yet.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Time", "Type", "VM", "Message", "Value"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().map((ev, i) => (
                  <tr key={ev.id} style={{ borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>{fmtDate(ev.timestamp)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                        {ruleTypeLabels[ev.type] || ev.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{ev.vmname || (ev.vmid ? `VM ${ev.vmid}` : "—")}</td>
                    <td style={{ padding: "10px 14px" }}>{ev.message}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>
                      {ev.value != null ? `${ev.value.toFixed(1)}%` : "—"}
                      {ev.threshold != null ? ` / ${ev.threshold}%` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 420, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>New Alert Rule</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Alert Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AlertRule["type"] }))}
                style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}
              >
                {Object.entries(ruleTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {needsVM(form.type) && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>VM Type</label>
                  <select
                    value={form.vmtype}
                    onChange={(e) => setForm((f) => ({ ...f, vmtype: e.target.value as "qemu" | "lxc" }))}
                    style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}
                  >
                    <option value="qemu">QEMU</option>
                    <option value="lxc">LXC</option>
                    <option value="">Any</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>VM ID (optional)</label>
                    <input
                      type="number"
                      value={form.vmid}
                      onChange={(e) => setForm((f) => ({ ...f, vmid: e.target.value }))}
                      placeholder="e.g. 101"
                      style={{ width: "100%", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>VM Name (optional)</label>
                    <input
                      value={form.vmname}
                      onChange={(e) => setForm((f) => ({ ...f, vmname: e.target.value }))}
                      placeholder="e.g. webserver"
                      style={{ width: "100%", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </>
            )}

            {needsThreshold(form.type) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Threshold (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={createRule} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Create Rule"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
