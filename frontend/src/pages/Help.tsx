export default function Help() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Help & Documentation</div>
          <div className="page-subtitle">ProxMon v1.0.0 — Proxmox VM Monitor & Manager</div>
        </div>
      </div>

      <div className="help-info">
        ℹ ProxMon is an internal monitoring tool for your Proxmox node <strong>vdcchn01</strong> at <strong>10.10.16.4</strong>.
        It runs as VM 201 on the 10.10.16.0/24 network, accessible at <strong>http://10.10.16.201:3000</strong>.
      </div>

      {/* Feature Overview */}
      <div className="help-section">
        <div className="help-section-title">Features</div>
        <div className="help-grid">
          <div className="help-card">
            <div className="help-card-icon">⬛</div>
            <div className="help-card-title">Dashboard</div>
            <div className="help-card-desc">
              Live overview of the Proxmox host — CPU, memory, disk usage, load averages, and a summary table of all VMs. Updates every 5 seconds via WebSocket.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">🖥</div>
            <div className="help-card-title">Virtual Machines</div>
            <div className="help-card-desc">
              Grid view of all VMs with real-time CPU and memory bars. Search by name or ID, filter by status (running/stopped) or type (QEMU/LXC). Click any card for details.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">📊</div>
            <div className="help-card-title">VM Detail & Charts</div>
            <div className="help-card-desc">
              Per-VM historical charts for CPU, memory, and network I/O. Switch between 1 Hour, 1 Day, and 1 Week views. Shows live status and full VM configuration.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">⚡</div>
            <div className="help-card-title">VM Actions</div>
            <div className="help-card-desc">
              Start, Stop (force), Shutdown (graceful), and Reboot VMs directly from the card or detail page. Destructive actions require confirmation.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">＋</div>
            <div className="help-card-title">Create VM</div>
            <div className="help-card-desc">
              Provision a new VM with custom CPU, RAM, and disk — or clone an existing template. VM IDs are auto-assigned from the reserved range 300–399.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">🌐</div>
            <div className="help-card-title">IP Address Tracking</div>
            <div className="help-card-desc">
              Auto-detects VM IPs via the QEMU guest agent (highest priority), cloud-init config, or ARP table. Guest-agent IPs are cached so the last known IP shows even when the agent is temporarily unreachable. Manual overrides are supported per VM.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">🔒</div>
            <div className="help-card-title">VM Locking</div>
            <div className="help-card-desc">
              Lock any VM to prevent accidental power actions. Locked VMs display a lock badge and all action buttons are disabled until explicitly unlocked. Requires operator role or above.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">🖵</div>
            <div className="help-card-title">VNC Console</div>
            <div className="help-card-desc">
              Open an in-browser VNC console to a running VM directly from the detail page. ProxMon proxies the Proxmox VNC WebSocket — no additional client software required.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">🔔</div>
            <div className="help-card-title">Alerts & Monitoring</div>
            <div className="help-card-desc">
              Define threshold rules for VM offline, high CPU, high RAM (per-VM or node-wide). Toggle rules on/off without deleting them. The History tab shows all triggered alert events with timestamps and values.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">📋</div>
            <div className="help-card-title">Audit Log</div>
            <div className="help-card-desc">
              Immutable record of every VM action — who did it, when, and whether it succeeded. Filter by username, action type, or target VM. Admins and operators can view; only admins can access user management.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">👥</div>
            <div className="help-card-title">User Management</div>
            <div className="help-card-desc">
              Admins can create, edit, enable/disable, and delete user accounts. Three roles: <strong>Admin</strong> (full access), <strong>Operator</strong> (VM actions), <strong>Viewer</strong> (read-only). The last active admin cannot be deleted.
            </div>
          </div>
          <div className="help-card">
            <div className="help-card-icon">🟢</div>
            <div className="help-card-title">Live Indicator</div>
            <div className="help-card-desc">
              Green dot in the sidebar = live WebSocket connection. If it turns grey, ProxMon will auto-reconnect every 4 seconds. No manual refresh needed.
            </div>
          </div>
        </div>
      </div>

      {/* Create VM Guide */}
      <div className="help-section">
        <div className="help-section-title">How to Create a VM</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>Fresh Install</div>
            <ol className="help-steps">
              <li><span className="help-step-num">1</span><span>Go to <strong>Create VM</strong> in the sidebar</span></li>
              <li><span className="help-step-num">2</span><span>Select the <strong>Fresh Install</strong> tab</span></li>
              <li><span className="help-step-num">3</span><span>Enter a VM name (e.g. <code>my-server</code>)</span></li>
              <li><span className="help-step-num">4</span><span>Set CPU cores using the slider (1–32)</span></li>
              <li><span className="help-step-num">5</span><span>Set RAM (512 MB – 64 GB)</span></li>
              <li><span className="help-step-num">6</span><span>Set disk size (5 GB – 2000 GB)</span></li>
              <li><span className="help-step-num">7</span><span>Pick an ISO image from the dropdown</span></li>
              <li><span className="help-step-num">8</span><span>Select OS type and click <strong>Create VM</strong></span></li>
            </ol>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>Clone from Template</div>
            <ol className="help-steps">
              <li><span className="help-step-num">1</span><span>Go to <strong>Create VM</strong> in the sidebar</span></li>
              <li><span className="help-step-num">2</span><span>Select the <strong>Clone Template</strong> tab</span></li>
              <li><span className="help-step-num">3</span><span>Choose a source template from the dropdown</span></li>
              <li><span className="help-step-num">4</span><span>Enter a name for the new VM</span></li>
              <li><span className="help-step-num">5</span><span><strong>Full Clone</strong> = independent copy (recommended)</span></li>
              <li><span className="help-step-num">6</span><span><strong>Linked Clone</strong> = shares base disk, saves space</span></li>
              <li><span className="help-step-num">7</span><span>Click <strong>Create VM</strong> — VM ID auto-assigned from 300–399</span></li>
            </ol>
          </div>
        </div>
      </div>

      {/* VM Actions Guide */}
      <div className="help-section">
        <div className="help-section-title">VM Power Actions</div>
        <div className="help-alert">
          ⚠ <strong>Force Stop</strong> immediately kills the VM process — may cause data loss or filesystem corruption. Always prefer <strong>Shutdown</strong> for graceful power off.
        </div>
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Action", "When Available", "Effect", "Safe?"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["▶ Start",    "Stopped",  "Powers on the VM",                     "✅ Yes"],
                ["↺ Reboot",   "Running",  "Graceful OS reboot (ACPI signal)",     "✅ Yes"],
                ["⏻ Shutdown", "Running",  "Graceful OS shutdown (ACPI signal)",   "✅ Yes"],
                ["⬛ Stop",    "Running",  "Force-kills VM process immediately",   "⚠ Risk"],
              ].map(([action, avail, effect, safe]) => (
                <tr key={action as string} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: 13 }}>{action}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>{avail}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>{effect}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>{safe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network & Policy */}
      <div className="help-section">
        <div className="help-section-title">Network & VM Policy</div>
        <div className="help-grid">
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Network</div>
            <table className="config-table">
              <tbody>
                <tr><td>Subnet</td><td><code>10.10.16.0/24</code></td></tr>
                <tr><td>Bridge</td><td><code>vmbr0</code></td></tr>
                <tr><td>ProxMon IP</td><td><code>10.10.16.201</code></td></tr>
                <tr><td>Proxmox Host</td><td><code>10.10.16.4:8006</code></td></tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>VM Provisioning Policy</div>
            <table className="config-table">
              <tbody>
                <tr><td>ID Range</td><td><code>300 – 399</code> (app-managed)</td></tr>
                <tr><td>Bridge</td><td><code>vmbr0</code> (fixed)</td></tr>
                <tr><td>Max VMs</td><td>100 (IDs 300–399)</td></tr>
                <tr><td>Access</td><td>Internal network (OpenVPN)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="help-section">
        <div className="help-section-title">Troubleshooting</div>
        <div className="card">
          <ol className="help-steps">
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>Dashboard shows "Connecting to Proxmox…"</strong><br />
                WebSocket not connected. Check sidebar indicator. If stuck, refresh the page. Backend may have restarted.
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>VM action fails (start/stop/reboot)</strong><br />
                Ensure the Proxmox API token (<code>root@pam!proxmon</code>) has sufficient permissions. Check backend logs: <code>sudo docker logs proxmon-backend</code>
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>Create VM fails — "No available VM IDs"</strong><br />
                All 100 IDs in range 300–399 are in use. Delete unused VMs or contact your admin to expand the range.
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>ISOs not showing in Create VM</strong><br />
                ISOs must be uploaded to the <code>local</code> storage on Proxmox. Go to Proxmox UI → local → ISO Images → Upload.
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>VM IP shows as blank or stale</strong><br />
                For QEMU VMs, install <code>qemu-guest-agent</code> inside the VM and ensure it's running — this gives the most accurate IP. For LXC containers, the IP is read from the network config. A manual override can be set on the VM detail page.
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>VNC console shows a blank screen or fails to connect</strong><br />
                The VM must be running and the Proxmox API token must have <code>VM.Console</code> permission. VNC also requires the QEMU display to be enabled in the VM config (not <code>none</code>).
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>Alerts page shows no data</strong><br />
                Alert rules and history are stored by the backend. If the page loads but shows empty, check that the <code>/api/alerts</code> routes are registered in the backend and the backend container is healthy: <code>docker logs proxmon-backend</code>
              </span>
            </li>
            <li>
              <span className="help-step-num">!</span>
              <span>
                <strong>Restart ProxMon containers</strong><br />
                <code>sudo docker compose -f ~/proxmon/docker-compose.yml restart</code>
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* About */}
      <div className="help-section">
        <div className="help-section-title">About</div>
        <div className="card">
          <table className="config-table">
            <tbody>
              <tr><td>Application</td><td>ProxMon v1.0.0</td></tr>
              <tr><td>Stack</td><td>React + TypeScript + Node.js + Express + WebSocket</td></tr>
              <tr><td>Charts</td><td>Recharts</td></tr>
              <tr><td>Deployment</td><td>Docker (nginx + Node.js containers)</td></tr>
              <tr><td>Proxmox API</td><td>PVE REST API v9.x</td></tr>
              <tr><td>Source Code</td><td><a href="https://github.com/bharathmithra2023-boop/proxmon" target="_blank" style={{ color: "var(--accent)" }}>github.com/bharathmithra2023-boop/proxmon</a></td></tr>
              <tr><td>Refresh Rate</td><td>5 seconds (WebSocket live stream)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
