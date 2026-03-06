import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import nodesRouter from "./routes/nodes";
import vmsRouter from "./routes/vms";
import actionsRouter from "./routes/actions";
import { initWebSocket } from "./ws/metricsStream";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    name: "ProxMon",
    config: {
      proxmoxHost: process.env.PROXMOX_HOST,
      node: process.env.PROXMOX_NODE,
      proxmonIp: process.env.PROXMON_IP,
      vmBridge: process.env.VM_BRIDGE || "vmbr0",
      vmidMin: parseInt(process.env.VMID_MIN || "300"),
      vmidMax: parseInt(process.env.VMID_MAX || "399"),
      vmNetwork: process.env.VM_NETWORK || "10.10.16.0/24",
    },
  });
});

app.use("/api/nodes", nodesRouter);
app.use("/api/vms", vmsRouter);
app.use("/api/actions", actionsRouter);

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ProxMon] Backend running on http://0.0.0.0:${PORT}`);
  console.log(`[ProxMon] WebSocket on ws://0.0.0.0:${PORT}/ws`);
  console.log(`[ProxMon] Proxmox host: ${process.env.PROXMOX_HOST}:${process.env.PROXMOX_PORT}`);
  console.log(`[ProxMon] Node: ${process.env.PROXMOX_NODE}`);
});
