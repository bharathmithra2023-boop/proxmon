import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { getProxmoxClient } from "../lib/proxmox";
import { findById } from "../lib/userStore";

interface WSMessage {
  type: string;
  payload?: unknown;
}

const JWT_SECRET = process.env.JWT_SECRET || "proxmon-change-this-secret";

function authenticateWS(req: IncomingMessage): boolean {
  try {
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = findById(decoded.userId);
    return !!(user && user.active);
  } catch {
    return false;
  }
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
    } catch {
      broadcast({ type: "error", payload: { message: "Failed to fetch metrics" } });
    }
  };

  let interval: ReturnType<typeof setInterval> | null = null;

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    if (!authenticateWS(req)) {
      ws.close(4001, "Unauthorized");
      return;
    }

    console.log("[WS] Client connected, total:", wss.clients.size);

    if (wss.clients.size === 1) {
      pushMetrics();
      interval = setInterval(pushMetrics, 5000);
    } else {
      pushMetrics();
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSMessage;
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {
        // ignore
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
