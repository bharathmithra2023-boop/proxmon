import { Router } from "express";
import { getProxmoxClient, extractProxmoxError } from "../lib/proxmox";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const vms = await client.getVMs();
    res.json({ success: true, data: vms });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
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
