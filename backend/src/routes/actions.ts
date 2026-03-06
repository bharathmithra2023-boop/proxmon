import { Router } from "express";
import { getProxmoxClient } from "../lib/proxmox";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.post("/:type/:vmid/start", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const taskId = await client.startVM(vmid, type);
    res.json({ success: true, data: { taskId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/:type/:vmid/stop", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const taskId = await client.stopVM(vmid, type);
    res.json({ success: true, data: { taskId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/:type/:vmid/shutdown", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const taskId = await client.shutdownVM(vmid, type);
    res.json({ success: true, data: { taskId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/:type/:vmid/reboot", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(req.params.vmid);
    const taskId = await client.rebootVM(vmid, type);
    res.json({ success: true, data: { taskId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/create", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const { name, cores, memory, diskSize, storage, iso, ostype } = req.body;

    const min = parseInt(process.env.VMID_MIN || "300");
    const max = parseInt(process.env.VMID_MAX || "399");
    const bridge = process.env.VM_BRIDGE || "vmbr0";

    const nextVmid = await client.getNextVMIDInRange(min, max);

    const params: Record<string, unknown> = {
      vmid: nextVmid,
      name,
      cores: cores || 1,
      memory: memory || 1024,
      ostype: ostype || "l26",
      scsihw: "virtio-scsi-pci",
      scsi0: `${storage}:${diskSize || 20}`,
      ide2: iso ? `${iso},media=cdrom` : "none,media=cdrom",
      net0: `virtio,bridge=${bridge}`,
      boot: "order=ide2;scsi0",
      agent: "enabled=1",
    };

    const taskId = await client.createVM(params);
    res.json({ success: true, data: { taskId, vmid: nextVmid } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/clone", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const { sourceVmid, name, full } = req.body;

    const min = parseInt(process.env.VMID_MIN || "300");
    const max = parseInt(process.env.VMID_MAX || "399");

    const targetVmid = await client.getNextVMIDInRange(min, max);
    const taskId = await client.cloneVM(sourceVmid, targetVmid, name, full !== false);
    res.json({ success: true, data: { taskId, vmid: targetVmid } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:type/:vmid", requireAdmin, async (req, res) => {
  try {
    const client = getProxmoxClient();
    const type = req.params.type as "qemu" | "lxc";
    const vmid = parseInt(String(req.params.vmid));
    const taskId = await client.deleteVM(vmid, type);
    res.json({ success: true, data: { taskId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/task/:upid", async (req, res) => {
  try {
    const client = getProxmoxClient();
    const status = await client.getTaskStatus(req.params.upid);
    res.json({ success: true, data: status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
