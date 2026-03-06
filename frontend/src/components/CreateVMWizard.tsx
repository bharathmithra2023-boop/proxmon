import { useState, useEffect } from "react";
import { nodeApi, vmApi, actionApi } from "../api/client";
import type { StorageInfo, ISOContent, VMTemplate } from "../api/client";

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

type Mode = "fresh" | "clone";

export default function CreateVMWizard({ onClose, onSuccess, onError }: Props) {
  const [mode, setMode] = useState<Mode>("fresh");
  const [storages, setStorages] = useState<StorageInfo[]>([]);
  const [isos, setISOs] = useState<ISOContent[]>([]);
  const [templates, setTemplates] = useState<VMTemplate[]>([]);
  const [nextId, setNextId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Fresh VM form
  const [name, setName] = useState("");
  const [cores, setCores] = useState(2);
  const [memory, setMemory] = useState(2048);
  const [diskSize, setDiskSize] = useState(20);
  const [storage, setStorage] = useState("");
  const [iso, setISO] = useState("");
  const [ostype, setOstype] = useState("l26");

  // Clone form
  const [sourceVmid, setSourceVmid] = useState<number>(0);
  const [cloneName, setCloneName] = useState("");
  const [fullClone, setFullClone] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, id] = await Promise.all([
          nodeApi.getStorages(),
          vmApi.getTemplates(),
          vmApi.getNextId(),
        ]);
        setStorages(s);
        setTemplates(t);
        setNextId(id);
        if (s.length > 0) {
          const disk = s.find((x) => x.content.includes("images")) || s[0];
          setStorage(disk.storage);
          // load ISOs from first ISO-capable storage
          const isoStorage = s.find((x) => x.content.includes("iso"));
          if (isoStorage) {
            const isosData = await nodeApi.getISOs(isoStorage.storage);
            setISOs(isosData);
          }
        }
        if (t.length > 0) setSourceVmid(t[0].vmid);
      } catch {
        // storages may be empty in dev
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!name && mode === "fresh") { onError("VM name is required"); return; }
    if (!cloneName && mode === "clone") { onError("Clone name is required"); return; }

    setLoading(true);
    try {
      if (mode === "fresh") {
        const res = await actionApi.create({
          name,
          cores,
          memory,
          diskSize,
          storage,
          iso: iso || undefined,
          ostype,
        });
        onSuccess(`VM "${name}" (ID: ${res.data?.vmid}) created. Task: ${res.data?.taskId}`);
      } else {
        const res = await actionApi.clone({ sourceVmid, name: cloneName, full: fullClone });
        onSuccess(`Clone "${cloneName}" (ID: ${res.data?.vmid}) started. Task: ${res.data?.taskId}`);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Create failed";
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const diskStorages = storages.filter((s) => s.content?.includes("images"));
  const isoStorages = storages.filter((s) => s.content?.includes("iso"));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Create Virtual Machine</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loadingData ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <span className="spinner" />
            </div>
          ) : (
            <>
              <div className="tab-bar">
                <button className={`tab-btn ${mode === "fresh" ? "active" : ""}`} onClick={() => setMode("fresh")}>
                  Fresh Install
                </button>
                <button
                  className={`tab-btn ${mode === "clone" ? "active" : ""}`}
                  onClick={() => setMode("clone")}
                  disabled={templates.length === 0}
                  title={templates.length === 0 ? "No templates available" : ""}
                >
                  Clone Template {templates.length === 0 && "(no templates)"}
                </button>
              </div>

              {mode === "fresh" && (
                <>
                  <div className="form-group">
                    <label className="form-label">VM Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-vm" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">VM ID</label>
                    <input type="number" value={nextId || ""} disabled style={{ opacity: 0.5 }} />
                    <div className="form-hint">
                      Auto-assigned from reserved range <strong style={{ color: "var(--accent)" }}>300–399</strong>
                      {nextId ? ` — next available: ${nextId}` : ""}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      CPU Cores <span className="slider-value">{cores}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={32}
                      value={cores}
                      onChange={(e) => setCores(parseInt(e.target.value))}
                    />
                    <div className="form-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>1</span><span>32</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Memory <span className="slider-value">{memory >= 1024 ? `${memory / 1024} GB` : `${memory} MB`}</span>
                    </label>
                    <input
                      type="range"
                      min={512}
                      max={65536}
                      step={512}
                      value={memory}
                      onChange={(e) => setMemory(parseInt(e.target.value))}
                    />
                    <div className="form-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>512 MB</span><span>64 GB</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Disk Size <span className="slider-value">{diskSize} GB</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={2000}
                      step={5}
                      value={diskSize}
                      onChange={(e) => setDiskSize(parseInt(e.target.value))}
                    />
                    <div className="form-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>5 GB</span><span>2000 GB</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Storage Target</label>
                    <select value={storage} onChange={(e) => setStorage(e.target.value)}>
                      {diskStorages.length === 0 && <option value="">No disk storage available</option>}
                      {diskStorages.map((s) => (
                        <option key={s.storage} value={s.storage}>
                          {s.storage} ({s.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ISO Image (optional)</label>
                    <select value={iso} onChange={(e) => setISO(e.target.value)}>
                      <option value="">No ISO (boot from disk)</option>
                      {isoStorages.map((s) => (
                        <option key={s.storage} value="" disabled>
                          — {s.storage} —
                        </option>
                      ))}
                      {isos.map((i) => (
                        <option key={i.volid} value={i.volid}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">OS Type</label>
                    <select value={ostype} onChange={(e) => setOstype(e.target.value)}>
                      <option value="l26">Linux 6.x / 5.x (l26)</option>
                      <option value="l24">Linux 2.4 (l24)</option>
                      <option value="win11">Windows 11</option>
                      <option value="win10">Windows 10 / 2019</option>
                      <option value="win8">Windows 8 / 2012</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Network Bridge</label>
                    <input value="vmbr0" disabled style={{ opacity: 0.6 }} />
                    <div className="form-hint">Fixed to <strong>vmbr0</strong> · subnet 10.10.16.0/24</div>
                  </div>
                </>
              )}

              {mode === "clone" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Source Template</label>
                    <select value={sourceVmid} onChange={(e) => setSourceVmid(parseInt(e.target.value))}>
                      {templates.map((t) => (
                        <option key={t.vmid} value={t.vmid}>
                          {t.name} (ID: {t.vmid})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">New VM Name *</label>
                    <input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="cloned-vm" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Clone Type</label>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="cloneType"
                          checked={fullClone}
                          onChange={() => setFullClone(true)}
                          style={{ width: "auto" }}
                        />
                        <span style={{ color: "var(--text-primary)" }}>Full Clone</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="cloneType"
                          checked={!fullClone}
                          onChange={() => setFullClone(false)}
                          style={{ width: "auto" }}
                        />
                        <span style={{ color: "var(--text-primary)" }}>Linked Clone</span>
                      </label>
                    </div>
                    <div className="form-hint">
                      {fullClone
                        ? "Independent full copy — uses more disk but is self-contained."
                        : "Shares base disk with template — saves space but depends on template."}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">New VM ID</label>
                    <input type="text" value={nextId || ""} disabled style={{ opacity: 0.5 }} />
                    <div className="form-hint">
                      Auto-assigned from reserved range <strong style={{ color: "var(--accent)" }}>300–399</strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Network Bridge</label>
                    <input value="vmbr0" disabled style={{ opacity: 0.6 }} />
                    <div className="form-hint">Fixed to <strong>vmbr0</strong> · subnet 10.10.16.0/24</div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading || loadingData}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Create VM"}
          </button>
        </div>
      </div>
    </div>
  );
}
