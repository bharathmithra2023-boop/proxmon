import { Router } from "express";
import { getProxmoxClient, extractProxmoxError } from "../lib/proxmox";

const router = Router();

router.get("/status", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const status = await client.getNodeStatus();
    res.json({ success: true, data: status });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/storages", async (_req, res) => {
  try {
    const client = getProxmoxClient();
    const storages = await client.getStorages();
    res.json({ success: true, data: storages });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/storages/:storage/isos", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const isos = await client.getISOs(req.params.storage);
    res.json({ success: true, data: isos });
  } catch (err: unknown) {
    const message = extractProxmoxError(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
