import { useState, useEffect } from "react";

export default function Settings() {
  const [host, setHost] = useState("vdcchn01.mithraconsulting.com");
  const [port, setPort] = useState("8006");
  const [node, setNode] = useState("pve");
  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("proxmon_settings");
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed.host) setHost(parsed.host);
      if (parsed.port) setPort(parsed.port);
      if (parsed.node) setNode(parsed.node);
      if (parsed.tokenId) setTokenId(parsed.tokenId);
    }
  }, []);

  const save = () => {
    localStorage.setItem("proxmon_settings", JSON.stringify({ host, port, node, tokenId }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data.status === "ok") {
        setTestResult({ ok: true, msg: `Connected — ProxMon v${data.version}` });
      } else {
        setTestResult({ ok: false, msg: "Backend responded but status unknown" });
      }
    } catch {
      setTestResult({ ok: false, msg: "Cannot reach backend. Is it running?" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">ProxMon configuration</div>
        </div>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="settings-title">Proxmox Connection</div>
          <div style={{ background: "var(--warning-dim)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--warning)", marginBottom: 18 }}>
            ⚠ API credentials are configured in the backend <code>.env</code> file on the server. These fields are for display only.
          </div>

          <div className="form-group">
            <label className="form-label">Proxmox Host</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.100" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Port</label>
              <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="8006" />
            </div>
            <div className="form-group">
              <label className="form-label">Node Name</label>
              <input value={node} onChange={(e) => setNode(e.target.value)} placeholder="pve" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Token ID</label>
            <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="root@pam!proxmon" />
            <div className="form-hint">Format: user@realm!tokenname</div>
          </div>

          <div className="form-group">
            <label className="form-label">Token Secret</label>
            <input
              type="password"
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
              placeholder="Stored securely in .env on server"
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save}>
              {saved ? "✓ Saved" : "Save Settings"}
            </button>
            <button className="btn btn-ghost" onClick={testConnection} disabled={testing}>
              {testing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Test Connection"}
            </button>
          </div>

          {testResult && (
            <div style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              background: testResult.ok ? "var(--success-dim)" : "var(--danger-dim)",
              color: testResult.ok ? "var(--success)" : "var(--danger)",
              border: `1px solid ${testResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}>
              {testResult.ok ? "✓" : "✕"} {testResult.msg}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="settings-title">Network & VM Policy</div>
          <table className="config-table">
            <tbody>
              <tr><td>ProxMon Server IP</td><td><code>10.10.16.201</code></td></tr>
              <tr><td>VM Network</td><td><code>10.10.16.0/24</code></td></tr>
              <tr><td>VM Bridge</td><td><code>vmbr0</code></td></tr>
              <tr><td>App-Managed VM IDs</td><td><code>300–399</code></td></tr>
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="settings-title">About ProxMon</div>
          <table className="config-table">
            <tbody>
              <tr><td>Version</td><td>1.0.0</td></tr>
              <tr><td>Proxmox Target</td><td>vdcchn01.mithraconsulting.com:8006</td></tr>
              <tr><td>Refresh Interval</td><td>5 seconds (WebSocket)</td></tr>
              <tr><td>Access Control</td><td>Internal network (OpenVPN)</td></tr>
              <tr><td>PVE API</td><td>v9.x compatible</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="settings-title">Proxmox API Token Setup</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <p>To create an API token in Proxmox:</p>
            <ol style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Log into Proxmox Web UI → Datacenter → Permissions → API Tokens</li>
              <li>Click <strong>Add</strong></li>
              <li>User: <code>root@pam</code> · Token ID: <code>proxmon</code></li>
              <li>Uncheck <em>Privilege Separation</em> for full access</li>
              <li>Copy the token secret and put it in <code>backend/.env</code></li>
            </ol>
            <p style={{ marginTop: 12 }}>Required permission: <code>PVEAdmin</code> on <code>/</code> (or granular per-VM)</p>
          </div>
        </div>
      </div>
    </>
  );
}
