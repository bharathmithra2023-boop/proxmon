import type { WSStatus } from "../hooks/useWebSocket";

type Page = "dashboard" | "vms" | "create" | "settings";

interface Props {
  page: Page;
  onNav: (p: Page) => void;
  wsStatus: WSStatus;
}

const wsLabels: Record<WSStatus, string> = {
  connecting: "Connecting…",
  connected: "Live",
  disconnected: "Reconnecting…",
  error: "Connection error",
};

export default function Sidebar({ page, onNav, wsStatus }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">P</div>
        <div>
          <div className="sidebar-logo-text">ProxMon</div>
          <div className="sidebar-logo-sub">PROXMOX MONITOR</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Monitor</div>
        <button className={`sidebar-nav-item ${page === "dashboard" ? "active" : ""}`} onClick={() => onNav("dashboard")}>
          <span className="nav-icon">⬛</span>
          <span>Dashboard</span>
        </button>
        <button className={`sidebar-nav-item ${page === "vms" ? "active" : ""}`} onClick={() => onNav("vms")}>
          <span className="nav-icon">🖥</span>
          <span>Virtual Machines</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Manage</div>
        <button className={`sidebar-nav-item ${page === "create" ? "active" : ""}`} onClick={() => onNav("create")}>
          <span className="nav-icon">＋</span>
          <span>Create VM</span>
        </button>
        <button className={`sidebar-nav-item ${page === "settings" ? "active" : ""}`} onClick={() => onNav("settings")}>
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </button>
      </div>

      <div className="sidebar-status">
        <div className="ws-indicator">
          <span className={`ws-dot ${wsStatus}`} />
          <span>{wsLabels[wsStatus]}</span>
        </div>
      </div>
    </aside>
  );
}
