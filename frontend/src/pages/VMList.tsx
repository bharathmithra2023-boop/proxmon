import { useState } from "react";
import type { VMStatus } from "../api/client";
import VMCard from "../components/VMCard";
import VMDetail from "./VMDetail";

interface Props {
  vms: VMStatus[];
  onToast: (msg: string, type: "success" | "error") => void;
  userRole?: string;
}

type Filter = "all" | "running" | "stopped" | "qemu" | "lxc";

export default function VMList({ vms, onToast, userRole }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<VMStatus | null>(null);

  if (selected) {
    return <VMDetail vm={selected} onBack={() => setSelected(null)} onToast={onToast} userRole={userRole} onRemove={() => setSelected(null)} />;
  }

  const filtered = vms.filter((vm) => {
    const matchSearch = !search || vm.name?.toLowerCase().includes(search.toLowerCase()) || String(vm.vmid).includes(search);
    const matchFilter = filter === "all" || filter === vm.status || filter === vm.type;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Virtual Machines</div>
          <div className="page-subtitle">{vms.length} total · {vms.filter((v) => v.status === "running").length} running</div>
        </div>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">All</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="qemu">QEMU</option>
          <option value="lxc">LXC</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No VMs match your filter</div>
        </div>
      ) : (
        <div className="vm-grid">
          {filtered.map((vm) => (
            <VMCard
              key={`${vm.type}-${vm.vmid}`}
              vm={vm}
              onClick={() => setSelected(vm)}
              onAction={onToast}
              readOnly={userRole === "viewer"}
            />
          ))}
        </div>
      )}
    </>
  );
}
