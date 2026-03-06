import axios from "axios";

const api = axios.create({ baseURL: "/api" });

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
  type: "qemu" | "lxc";
}

export interface NodeStatus {
  cpu: number;
  memory: { used: number; total: number; free: number };
  rootfs: { used: number; total: number; free: number };
  uptime: number;
  loadavg: number[];
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
}

export interface ISOContent {
  volid: string;
  name: string;
  size: number;
}

export interface VMTemplate {
  vmid: number;
  name: string;
}

export interface CreateVMPayload {
  vmid?: number;
  name: string;
  cores: number;
  memory: number;
  diskSize: number;
  storage: string;
  iso?: string;
  ostype?: string;
}

export interface CloneVMPayload {
  sourceVmid: number;
  name: string;
  full?: boolean;
}

export const nodeApi = {
  getStatus: () => api.get<{ success: boolean; data: NodeStatus }>("/nodes/status").then((r) => r.data.data),
  getStorages: () => api.get<{ success: boolean; data: StorageInfo[] }>("/nodes/storages").then((r) => r.data.data),
  getISOs: (storage: string) => api.get<{ success: boolean; data: ISOContent[] }>(`/nodes/storages/${storage}/isos`).then((r) => r.data.data),
};

export const vmApi = {
  getAll: () => api.get<{ success: boolean; data: VMStatus[] }>("/vms").then((r) => r.data.data),
  getStatus: (type: string, vmid: number) => api.get<{ success: boolean; data: VMStatus }>(`/vms/${type}/${vmid}/status`).then((r) => r.data.data),
  getRRD: (type: string, vmid: number, timeframe = "hour") => api.get(`/vms/${type}/${vmid}/rrd`, { params: { timeframe } }).then((r) => r.data.data),
  getConfig: (type: string, vmid: number) => api.get(`/vms/${type}/${vmid}/config`).then((r) => r.data.data),
  getTemplates: () => api.get<{ success: boolean; data: VMTemplate[] }>("/vms/templates").then((r) => r.data.data),
  getNextId: () => api.get<{ success: boolean; data: number }>("/vms/nextid").then((r) => r.data.data),
};

export const actionApi = {
  start: (type: string, vmid: number) => api.post(`/actions/${type}/${vmid}/start`).then((r) => r.data),
  stop: (type: string, vmid: number) => api.post(`/actions/${type}/${vmid}/stop`).then((r) => r.data),
  shutdown: (type: string, vmid: number) => api.post(`/actions/${type}/${vmid}/shutdown`).then((r) => r.data),
  reboot: (type: string, vmid: number) => api.post(`/actions/${type}/${vmid}/reboot`).then((r) => r.data),
  create: (payload: CreateVMPayload) => api.post("/actions/create", payload).then((r) => r.data),
  clone: (payload: CloneVMPayload) => api.post("/actions/clone", payload).then((r) => r.data),
  taskStatus: (upid: string) => api.get(`/actions/task/${encodeURIComponent(upid)}`).then((r) => r.data.data),
};

export default api;
