import type { WSStatus } from "../hooks/useWebSocket";
import type { Theme } from "../hooks/useTheme";
import type { AuthUser } from "../api/client";

type Page = "dashboard" | "vms" | "create" | "settings" | "help" | "users";

interface Props {
  page: Page;
  onNav: (p: Page) => void;
  wsStatus: WSStatus;
  theme: Theme;
  onThemeToggle: () => void;
  user: AuthUser;
  onLogout: () => void;
}

const wsLabels: Record<WSStatus, string> = {
  connecting: "Connecting…",
  connected: "Live",
  disconnected: "Reconnecting…",
  error: "Connection error",
};

const roleColors: Record<string, string> = {
  admin:    "var(--danger)",
  operator: "var(--warning)",
  viewer:   "var(--text-muted)",
};

export default function Sidebar({ page, onNav, wsStatus, theme, onThemeToggle, user, onLogout }: Props) {
  const isLight = theme === "light";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">P</div>
        <div>
          <div className="sidebar-logo-text">ProxMon</div>
          <div className="sidebar-logo-sub">PROXMOX MONITOR</div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--accent-glow)",
          border: "1px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
        }}>
          {(user.fullName || user.username).charAt(0).toUpperCase()}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.fullName || user.username}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: roleColors[user.role], textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {user.role}
          </div>
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
        {user.role !== "viewer" && (
          <button className={`sidebar-nav-item ${page === "create" ? "active" : ""}`} onClick={() => onNav("create")}>
            <span className="nav-icon">＋</span>
            <span>Create VM</span>
          </button>
        )}
        {user.role === "admin" && (
          <button className={`sidebar-nav-item ${page === "users" ? "active" : ""}`} onClick={() => onNav("users")}>
            <span className="nav-icon">👥</span>
            <span>Users</span>
          </button>
        )}
        <button className={`sidebar-nav-item ${page === "settings" ? "active" : ""}`} onClick={() => onNav("settings")}>
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </button>
        <button className={`sidebar-nav-item ${page === "help" ? "active" : ""}`} onClick={() => onNav("help")}>
          <span className="nav-icon">?</span>
          <span>Help</span>
        </button>
      </div>

      <div className="sidebar-status">
        <button className="theme-toggle" onClick={onThemeToggle}>
          <span>{isLight ? "☀ Light Mode" : "☾ Dark Mode"}</span>
          <div className={`theme-toggle-track ${isLight ? "on" : ""}`}>
            <div className="theme-toggle-thumb" />
          </div>
        </button>
        <div className="ws-indicator">
          <span className={`ws-dot ${wsStatus}`} />
          <span>{wsLabels[wsStatus]}</span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={onLogout}
          style={{ width: "100%", marginTop: 6, fontSize: 12, justifyContent: "center" }}
        >
          ⏏ Sign Out
        </button>
      </div>
    </aside>
  );
}
