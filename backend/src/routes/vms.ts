import { Router } from "express";
import { getProxmoxClient, extractProxmoxError } from "../lib/proxmox";
import { getLockedKeys } from "../lib/lockStore";
import { getAllStoredIPs, setStoredIP, clearStoredIP, getAllAgentIPs } from "../lib/ipStore";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const vms = await client.getVMs();
    const locked = getLockedKeys();
    const data = vms.map((vm) => ({ ...vm, lock: locked.has(`${vm.type}:${vm.vmid}`) ? "proxmon" : undefined }));
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/ips", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const vms = await client.getVMs();
    // Merge priority: manual override > live detection > agent cache (last known)
    // Agent IPs are auto-persisted by getAllVMIPs when the guest agent responds.
    const autoIPs = await client.getAllVMIPs(vms);
    const agentIPs = getAllAgentIPs();
    const storedIPs = getAllStoredIPs();
    const merged = { ...agentIPs, ...autoIPs, ...storedIPs };
    res.json({ success: true, data: merged });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.put("/:type/:vmid/ip", async (req, res) => {
  try {
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const { ip } = req.body as { ip: string };
    if (!ip) { clearStoredIP(type, vmid); }
    else { setStoredIP(type, vmid, ip.trim()); }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: extractProxmoxError(err) });
  }
});

router.get("/disk", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const vms = await client.getVMs();
    const data = await client.getAllVMDiskUsages(vms);
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: extractProxmoxError(err) });
  }
});

router.get("/templates", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const templates = await client.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/nextid", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const min = parseInt(process.env.VMID_MIN || "300");
    const max = parseInt(process.env.VMID_MAX || "399");
    const vmid = await client.getNextVMIDInRange(min, max);
    res.json({ success: true, data: vmid });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/:type/:vmid/status", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const status = await client.getVMStatus(vmid, type);
    res.json({ success: true, data: status });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/:type/:vmid/rrd", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const timeframe = (req.query.timeframe as string) || "hour";
    const data = await client.getVMRRD(vmid, type, timeframe);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/:type/:vmid/config", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const config = await client.getVMConfig(vmid, type);
    res.json({ success: true, data: config });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
