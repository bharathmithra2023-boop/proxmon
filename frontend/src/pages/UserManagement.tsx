import { useState, useEffect } from "react";
import { usersApi } from "../api/client";
import type { ManagedUser } from "../api/client";

interface Props {
  currentUserId: string;
  onToast: (msg: string, type: "success" | "error") => void;
}

const roleBadge: Record<string, { label: string; color: string; bg: string }> = {
  admin:    { label: "Admin",    color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  operator: { label: "Operator", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  viewer:   { label: "Viewer",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const ROLE_DESC: Record<string, string> = {
  admin:    "Full access — manage users, create VMs, all actions",
  operator: "View + VM power actions — no create, no user management",
  viewer:   "Read-only — no actions, no create",
};

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  role: string;
  fullName: string;
  email: string;
}

const emptyForm: FormData = { username: "", password: "", confirmPassword: "", role: "viewer", fullName: "", email: "" };

export default function UserManagement({ currentUserId, onToast }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    try {
      setUsers(await usersApi.getAll());
    } catch {
      onToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setFormError(""); setShowCreate(true); };
  const openEdit = (u: ManagedUser) => {
    setForm({ username: u.username, password: "", confirmPassword: "", role: u.role, fullName: u.fullName, email: u.email });
    setFormError("");
    setEditUser(u);
  };

  const handleSave = async () => {
    setFormError("");
    if (!editUser) {
      if (!form.username.trim()) { setFormError("Username is required"); return; }
      if (!form.password) { setFormError("Password is required"); return; }
    }
    if (form.password && form.password !== form.confirmPassword) {
      setFormError("Passwords do not match"); return;
    }
    if (form.password && form.password.length < 6) {
      setFormError("Password must be at least 6 characters"); return;
    }
    setSaving(true);
    try {
      if (editUser) {
        const updates: Record<string, unknown> = { role: form.role, fullName: form.fullName, email: form.email };
        if (form.password) updates.password = form.password;
        await usersApi.update(editUser.id, updates);
        onToast(`User "${editUser.username}" updated`, "success");
        setEditUser(null);
      } else {
        await usersApi.create({ username: form.username, password: form.password, role: form.role, fullName: form.fullName, email: form.email });
        onToast(`User "${form.username}" created`, "success");
        setShowCreate(false);
      }
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: ManagedUser) => {
    try {
      await usersApi.update(u.id, { active: !u.active });
      onToast(`User "${u.username}" ${u.active ? "disabled" : "enabled"}`, "success");
      load();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Failed", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await usersApi.delete(deleteTarget.id);
      onToast(`User "${deleteTarget.username}" deleted`, "success");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Failed", "error");
    }
  };

  const isFormOpen = showCreate || !!editUser;
  const formTitle = editUser ? `Edit User — ${editUser.username}` : "Create New User";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-subtitle">{users.length} user{users.length !== 1 ? "s" : ""} · Admin only</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add User</button>
      </div>

      {/* Role legend */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(ROLE_DESC).map(([role, desc]) => {
          const b = roleBadge[role];
          return (
            <div key={role} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", fontSize: 12 }}>
              <span style={{ background: b.bg, color: b.color, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginRight: 8 }}>{b.label}</span>
              <span style={{ color: "var(--text-secondary)" }}>{desc}</span>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="loading-screen" style={{ height: 200 }}><span className="spinner" /></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["User", "Role", "Email", "Last Login", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rb = roleBadge[u.role];
                const isMe = u.id === currentUserId;
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", opacity: u.active ? 1 : 0.5 }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName || u.username}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{u.username} {isMe && <span style={{ color: "var(--accent)" }}>(you)</span>}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: rb.bg, color: rb.color, fontWeight: 700, fontSize: 11, padding: "3px 9px", borderRadius: 5 }}>{rb.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{u.email || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={`status-badge ${u.active ? "running" : "stopped"}`}>
                        <span className="dot" />
                        {u.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        {!isMe && (
                          <button
                            className={`btn btn-sm ${u.active ? "btn-warning" : "btn-success"}`}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.active ? "Disable" : "Enable"}
                          </button>
                        )}
                        {!isMe && (
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(u)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditUser(null); }}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{formTitle}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setEditUser(null); }}>✕</button>
            </div>
            <div className="modal-body">
              {formError && (
                <div className="error-banner" style={{ marginBottom: 16 }}>✕ {formError}</div>
              )}
              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. jsmith" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="John Smith" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin — full access</option>
                  <option value="operator">Operator — view + VM actions</option>
                  <option value="viewer">Viewer — read only</option>
                </select>
                <div className="form-hint">{ROLE_DESC[form.role]}</div>
              </div>
              <div className="form-group">
                <label className="form-label">{editUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editUser ? "Leave blank to keep current" : "Min 6 characters"} autoComplete="new-password" />
              </div>
              {form.password && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat password" autoComplete="new-password" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowCreate(false); setEditUser(null); }} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : editUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Delete User</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="confirm-icon">🗑</div>
              <p className="confirm-text">
                Permanently delete <strong>{deleteTarget.fullName || deleteTarget.username}</strong>?
                <br /><span style={{ fontSize: 12, color: "var(--danger)" }}>This action cannot be undone.</span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
