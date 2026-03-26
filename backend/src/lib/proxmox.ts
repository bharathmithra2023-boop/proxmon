import axios, { AxiosInstance } from "axios";
import https from "https";
import fs from "fs";
import { setAgentIP } from "./ipStore";

interface ProxmoxConfig {
  host: string;
  port: number;
  tokenId: string;
  tokenSecret: string;
  node: string;
}

export interface VMStatus {
  vmid: number;
  name: string;
  status: "running" | "stopped" | "paused";
  cpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  netin: number;
  netout: number;
  diskread: number;
  diskwrite: number;
  pid?: number;
  type: "qemu" | "lxc";
  lock?: string;
}

export function extractProxmoxError(err: unknown): string {
  if (err instanceof Error) {
    const axiosErr = err as { response?: { data?: unknown } };
    const data = axiosErr.response?.data;
    if (data && typeof data === "object") {
      const d = data as { errors?: Record<string, string>; message?: string };
      if (d.errors && typeof d.errors === "object") {
        return Object.values(d.errors).join("; ").trim();
      }
      if (d.message) return d.message;
    }
    if (typeof data === "string" && data.trim()) {
      // Plain text error from Proxmox — trim Perl stack traces
      return data.split(" at /usr/share")[0].trim();
    }
    return err.message;
  }
  return "Unknown error";
}

export interface NodeStatus {
  cpu: number;
  memory: { used: number; total: number; free: number };
  rootfs: { used: number; total: number; free: number };
  uptime: number;
  loadavg: number[];
  ksm: { shared: number };
  cpuinfo: { cores: number; sockets: number; model: string };
  pveversion: string;
}

export interface StorageInfo {
  storage: string;
  type: string;
  content: string;
  total: number;
  used: number;
  avail: number;
  active: boolean;
}

export interface ISOContent {
  volid: string;
  name: string;
  size: number;
  format: string;
}

export interface VMTemplate {
  vmid: number;
  name: string;
  template: number;
}

class ProxmoxClient {
  private client: AxiosInstance;
  public node: string;

  constructor(config: ProxmoxConfig) {
    this.node = config.node;
    this.client = axios.create({
      baseURL: `https://${config.host}:${config.port}/api2/json`,
      headers: {
        Authorization: `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000,
    });
  }

  async getNodeStatus(): Promise<NodeStatus> {
    const res = await this.client.get(`/nodes/${this.node}/status`);
    return res.data.data;
  }

  async getVMs(): Promise<VMStatus[]> {
    const [qemuRes, lxcRes] = await Promise.allSettled([
      this.client.get(`/nodes/${this.node}/qemu`),
      this.client.get(`/nodes/${this.node}/lxc`),
    ]);

    const vms: VMStatus[] = [];

    if (qemuRes.status === "fulfilled") {
      const qemuVMs = qemuRes.value.data.data.map((vm: VMStatus) => ({
        ...vm,
        type: "qemu" as const,
      }));
      vms.push(...qemuVMs);
    }

    if (lxcRes.status === "fulfilled") {
      const lxcVMs = lxcRes.value.data.data.map((vm: VMStatus) => ({
        ...vm,
        type: "lxc" as const,
      }));
      vms.push(...lxcVMs);
    }

    return vms.sort((a, b) => a.vmid - b.vmid);
  }

  async getVMStatus(vmid: number, type: "qemu" | "lxc"): Promise<VMStatus> {
    const res = await this.client.get(
      `/nodes/${this.node}/${type}/${vmid}/status/current`
    );
    return { ...res.data.data, vmid, type };
  }

  async getVMRRD(vmid: number, type: "qemu" | "lxc", timeframe = "hour") {
    const res = await this.client.get(
      `/nodes/${this.node}/${type}/${vmid}/rrddata`,
      { params: { timeframe, cf: "AVERAGE" } }
    );
    return res.data.data;
  }

  async getVMConfig(vmid: number, type: "qemu" | "lxc") {
    const res = await this.client.get(
      `/nodes/${this.node}/${type}/${vmid}/config`
    );
    return res.data.data;
  }

  // Read local ARP table — returns mac (lowercase, colon-separated) -> ip
  private readArpTable(): Record<string, string> {
    try {
      const lines = fs.readFileSync("/proc/net/arp", "utf-8").split("\n").slice(1);
      const map: Record<string, string> = {};
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const ip = parts[0];
          const mac = parts[3].toLowerCase();
          if (mac && mac !== "00:00:00:00:00:00") map[mac] = ip;
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  // Extract MAC from Proxmox net0 string e.g. "virtio=BC:24:11:A4:7D:FE,bridge=vmbr0"
  private parseMacFromNet0(net0: string): string | null {
    const m = net0.match(/(?:virtio|e1000|vmxnet3|rtl8139|ne2k_pci|pcnet)=([0-9A-Fa-f:]{17})/i)
           || net0.match(/hwaddr=([0-9A-Fa-f:]{17})/i);
    return m ? m[1].toLowerCase() : null;
  }

  async getVMIP(vmid: number, type: "qemu" | "lxc"): Promise<{ ip: string; source: "agent" | "cloudinit" | "arp" } | null> {
    try {
      if (type === "qemu") {
        // 1. Try QEMU guest agent (works if qemu-guest-agent is installed)
        try {
          const res = await this.client.get(
            `/nodes/${this.node}/qemu/${vmid}/agent/network-get-interfaces`
          );
          const ifaces: { name: string; "ip-addresses"?: { "ip-address": string; "ip-address-type": string }[] }[] =
            res.data.data?.result || [];
          for (const iface of ifaces) {
            if (iface.name === "lo") continue;
            for (const addr of iface["ip-addresses"] || []) {
              if (addr["ip-address-type"] === "ipv4" && !addr["ip-address"].startsWith("127.")) {
                return { ip: addr["ip-address"], source: "agent" };
              }
            }
          }
        } catch { /* agent not running */ }

        // 2. Match VM MAC against local ARP table
        const cfg = await this.client.get(`/nodes/${this.node}/qemu/${vmid}/config`);
        const cfgData = cfg.data.data || {};

        // Check ipconfig0 (cloud-init static IP)
        const ipconfig: string = cfgData.ipconfig0 || "";
        const ipcfgMatch = ipconfig.match(/ip=(\d+\.\d+\.\d+\.\d+)/);
        if (ipcfgMatch) return { ip: ipcfgMatch[1], source: "cloudinit" };

        // Match MAC -> ARP
        const net0: string = cfgData.net0 || "";
        const mac = this.parseMacFromNet0(net0);
        if (mac) {
          const arp = this.readArpTable();
          if (arp[mac]) return { ip: arp[mac], source: "arp" };
        }
        return null;
      } else {
        // LXC: net0 has explicit ip= field
        const res = await this.client.get(`/nodes/${this.node}/lxc/${vmid}/config`);
        const net0: string = res.data.data?.net0 || "";
        const match = net0.match(/ip=(\d+\.\d+\.\d+\.\d+)/);
        if (match) return { ip: match[1], source: "cloudinit" };

        // LXC fallback: ARP by MAC
        const mac = this.parseMacFromNet0(net0);
        if (mac) {
          const arp = this.readArpTable();
          if (arp[mac]) return { ip: arp[mac], source: "arp" };
        }
        return null;
      }
    } catch {
      return null;
    }
  }

  async getAllVMIPs(vms: { vmid: number; type: "qemu" | "lxc"; status: string }[]): Promise<Record<string, string>> {
    const running = vms.filter((v) => v.status === "running");
    const results = await Promise.allSettled(
      running.map((v) =>
        this.getVMIP(v.vmid, v.type).then((result) => ({
          key: `${v.type}:${v.vmid}`,
          type: v.type,
          vmid: v.vmid,
          result,
        }))
      )
    );
    const map: Record<string, string> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.result) {
        const { key, type, vmid, result } = r.value;
        map[key] = result.ip;
        if (result.source === "agent") {
          setAgentIP(type, vmid, result.ip);
        }
      }
    }
    return map;
  }

  async startVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/start`, {}
    );
    return res.data.data;
  }

  async stopVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/stop`, {}
    );
    return res.data.data;
  }

  async shutdownVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/shutdown`, {}
    );
    return res.data.data;
  }

  async rebootVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/reboot`, {}
    );
    return res.data.data;
  }

  async deleteVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.delete(
      `/nodes/${this.node}/${type}/${vmid}`
    );
    return res.data.data;
  }

  async getStorages(): Promise<StorageInfo[]> {
    const res = await this.client.get(`/nodes/${this.node}/storage`);
    return res.data.data.filter((s: StorageInfo) => s.active);
  }

  async getISOs(storage: string): Promise<ISOContent[]> {
    const res = await this.client.get(
      `/nodes/${this.node}/storage/${storage}/content`,
      { params: { content: "iso" } }
    );
    return res.data.data || [];
  }

  async getTemplates(): Promise<VMTemplate[]> {
    const res = await this.client.get(`/nodes/${this.node}/qemu`);
    return res.data.data
      .filter((vm: VMTemplate) => vm.template === 1)
      .map((vm: VMTemplate) => ({ vmid: vm.vmid, name: vm.name, template: 1 }));
  }

  async getNextVMID(): Promise<number> {
    const res = await this.client.get("/cluster/nextid");
    return parseInt(res.data.data);
  }

  async getNextVMIDInRange(min: number, max: number): Promise<number> {
    const vms = await this.getVMs();
    const usedIds = new Set(vms.map((v) => v.vmid));
    for (let id = min; id <= max; id++) {
      if (!usedIds.has(id)) return id;
    }
    throw new Error(`No available VM IDs in range ${min}–${max}. All IDs are in use.`);
  }

  async createVM(params: Record<string, unknown>): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/qemu`,
      params
    );
    return res.data.data;
  }

  async cloneVM(
    sourceVmid: number,
    targetVmid: number,
    name: string,
    full = true
  ): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/qemu/${sourceVmid}/clone`,
      { newid: targetVmid, name, full: full ? 1 : 0 }
    );
    return res.data.data;
  }

  async resizeDisk(
    vmid: number,
    type: "qemu" | "lxc",
    disk: string,
    size: string
  ): Promise<string> {
    const res = await this.client.put(
      `/nodes/${this.node}/${type}/${vmid}/resize`,
      { disk, size }
    );
    return res.data.data;
  }

  async getTaskStatus(upid: string) {
    const encodedUpid = encodeURIComponent(upid);
    const res = await this.client.get(
      `/nodes/${this.node}/tasks/${encodedUpid}/status`
    );
    return res.data.data;
  }

  async getVMDiskUsage(vmid: number): Promise<{ used: number; total: number } | null> {
    try {
      const res = await this.client.get(
        `/nodes/${this.node}/qemu/${vmid}/agent/get-fsinfo`
      );
      const filesystems: {
        mountpoint: string;
        type: string;
        "used-bytes": number;
        "total-bytes": number;
      }[] = res.data.data?.result || [];

      // Prefer the root filesystem for a single representative number
      const rootFs = filesystems.find((fs) => fs.mountpoint === "/");
      if (rootFs && rootFs["total-bytes"] > 0) {
        return { used: rootFs["used-bytes"], total: rootFs["total-bytes"] };
      }

      // Fallback: sum all physical (non-virtual) filesystems
      const virtual = new Set(["tmpfs", "devtmpfs", "sysfs", "proc", "cgroup", "cgroup2", "overlay", "devpts", "mqueue", "hugetlbfs", "debugfs", "securityfs", "pstore", "bpf", "tracefs", "fusectl", "efivarfs"]);
      const physical = filesystems.filter(
        (fs) => !virtual.has(fs.type) && fs["total-bytes"] > 0
      );
      if (physical.length > 0) {
        return {
          used: physical.reduce((a, fs) => a + fs["used-bytes"], 0),
          total: physical.reduce((a, fs) => a + fs["total-bytes"], 0),
        };
      }
      return null;
    } catch {
      return null; // agent not running or not installed
    }
  }

  async getAllVMDiskUsages(
    vms: { vmid: number; type: "qemu" | "lxc"; status: string }[]
  ): Promise<Record<string, { used: number; total: number }>> {
    const targets = vms.filter((v) => v.status === "running" && v.type === "qemu");
    const results = await Promise.allSettled(
      targets.map((v) =>
        this.getVMDiskUsage(v.vmid).then((disk) => ({ key: `qemu:${v.vmid}`, disk }))
      )
    );
    const map: Record<string, { used: number; total: number }> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.disk) {
        map[r.value.key] = r.value.disk;
      }
    }
    return map;
  }

  async createVNCProxy(vmid: number, type: "qemu" | "lxc"): Promise<{ port: string; ticket: string }> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/vncproxy`,
      { websocket: 1 }
    );
    return { port: String(res.data.data.port), ticket: res.data.data.ticket };
  }

  getVNCWebsocketUrl(vmid: number, type: "qemu" | "lxc", port: string, ticket: string): string {
    const host = process.env.PROXMOX_HOST || "localhost";
    const apiPort = process.env.PROXMOX_PORT || "8006";
    const encoded = encodeURIComponent(ticket);
    return `wss://${host}:${apiPort}/api2/json/nodes/${this.node}/${type}/${vmid}/vncwebsocket?port=${port}&vncticket=${encoded}`;
  }
}

let instance: ProxmoxClient | null = null;

export function getProxmoxClient(): ProxmoxClient {
  if (!instance) {
    instance = new ProxmoxClient({
      host: process.env.PROXMOX_HOST || "localhost",
      port: parseInt(process.env.PROXMOX_PORT || "8006"),
      tokenId: process.env.PROXMOX_TOKEN_ID || "",
      tokenSecret: process.env.PROXMOX_TOKEN_SECRET || "",
      node: process.env.PROXMOX_NODE || "pve",
    });
  }
  return instance;
}
