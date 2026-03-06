import axios, { AxiosInstance } from "axios";
import https from "https";

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

  async startVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/start`
    );
    return res.data.data;
  }

  async stopVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/stop`
    );
    return res.data.data;
  }

  async shutdownVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/shutdown`
    );
    return res.data.data;
  }

  async rebootVM(vmid: number, type: "qemu" | "lxc"): Promise<string> {
    const res = await this.client.post(
      `/nodes/${this.node}/${type}/${vmid}/status/reboot`
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
