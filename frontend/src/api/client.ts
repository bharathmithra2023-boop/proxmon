import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("proxmon_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("proxmon_token");
      localStorage.removeItem("proxmon_user");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "operator" | "viewer";
  fullName: string;
  email: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ success: boolean; data: { token: string; user: AuthUser } }>("/auth/login", { username, password }).then((r) => r.data.data),
  me: () =>
    api.get<{ success: boolean; data: AuthUser }>("/auth/me").then((r) => r.data.data),
};

export interface ManagedUser {
  id: string;
  username: string;
  role: "admin" | "operator" | "viewer";
  fullName: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  active: boolean;
}

export const usersApi = {
  getAll: () => api.get<{ success: boolean; data: ManagedUser[] }>("/users").then((r) => r.data.data),
  create: (data: { username: string; password: string; role: string; fullName: string; email: string }) =>
    api.post<{ success: boolean; data: ManagedUser }>("/users", data).then((r) => r.data.data),
  update: (id: string, data: Partial<{ password: string; role: string; fullName: string; email: string; active: boolean }>) =>
    api.put<{ success: boolean; data: ManagedUser }>(`/users/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/users/${id}`).then((r) => r.data),
};

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
  size: number;
  format: string;
  ctime?: number;
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
  remove: (type: string, vmid: number) => api.delete(`/actions/${type}/${vmid}`).then((r) => r.data),
};

export default api;
