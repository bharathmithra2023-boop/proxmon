import { useState } from "react";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Enter username and password"); return; }
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56,
            background: "linear-gradient(135deg, var(--accent), #6366f1)",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 800, color: "#fff",
            margin: "0 auto 14px",
            boxShadow: "0 8px 32px var(--accent-glow)",
          }}>P</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>ProxMon</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
            Proxmox VM Monitor
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          borderRadius: 18,
          padding: "32px 28px",
          boxShadow: "var(--shadow)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>Sign in</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
            Internal access — Mithra Consulting
          </div>

          {error && (
            <div style={{
              background: "var(--danger-dim)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "10px 14px",
              color: "var(--danger)", fontSize: 13, marginBottom: 18,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              ✕ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, marginTop: 8, justifyContent: "center" }}
            >
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Sign In"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--text-muted)" }}>
          First time? Default: <code style={{ color: "var(--accent)" }}>admin</code> / <code style={{ color: "var(--accent)" }}>admin123</code>
        </div>
      </div>
    </div>
  );
}
