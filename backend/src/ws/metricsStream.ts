import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { getProxmoxClient } from "../lib/proxmox";

interface WSMessage {
  type: string;
  payload?: unknown;
}

export function initWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const broadcast = (data: WSMessage) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  };

  const pushMetrics = async () => {
    if (wss.clients.size === 0) return;
    try {
      const client = getProxmoxClient();
      const [vms, nodeStatus] = await Promise.all([
        client.getVMs(),
        client.getNodeStatus(),
      ]);
      broadcast({ type: "metrics", payload: { vms, nodeStatus } });
    } catch (err) {
      broadcast({ type: "error", payload: { message: "Failed to fetch metrics" } });
    }
  };

  let interval: ReturnType<typeof setInterval> | null = null;

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WS] Client connected, total:", wss.clients.size);

    // Start interval only when first client connects
    if (wss.clients.size === 1) {
      pushMetrics();
      interval = setInterval(pushMetrics, 5000);
    } else {
      // Send immediately to new client
      pushMetrics();
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSMessage;
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      console.log("[WS] Client disconnected, total:", wss.clients.size);
      if (wss.clients.size === 0 && interval) {
        clearInterval(interval);
        interval = null;
      }
    });
  });

  return wss;
}
