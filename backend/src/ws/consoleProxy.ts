import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import https from "https";
import jwt from "jsonwebtoken";
import { findById } from "../lib/userStore";
import { getProxmoxClient } from "../lib/proxmox";

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

export function initConsoleProxy(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWS: WebSocket, req: IncomingMessage) => {
    if (!authenticateWS(req)) {
      clientWS.close(4001, "Unauthorized");
      return;
    }

    const url = new URL(req.url || "", "http://localhost");
    const type = url.searchParams.get("type") as "qemu" | "lxc" | null;
    const vmid = parseInt(url.searchParams.get("vmid") || "0");
    const ticketParam = url.searchParams.get("ticket") || "";
    const portParam = url.searchParams.get("port") || "";

    if (!type || !vmid) {
      clientWS.close(4002, "Missing type or vmid");
      return;
    }

    try {
      const proxmox = getProxmoxClient();
      let port: string;
      let ticket: string;
      if (ticketParam && portParam) {
        port = portParam;
        ticket = ticketParam;
      } else {
        ({ port, ticket } = await proxmox.createVNCProxy(vmid, type));
      }
      const wsUrl = proxmox.getVNCWebsocketUrl(vmid, type, port, ticket);

      // Connect to Proxmox VNC websocket
      const proxmoxWS = new WebSocket(wsUrl, "binary", {
        rejectUnauthorized: false,
        headers: {
          Authorization: `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}`,
        },
      });

      proxmoxWS.on("open", () => {
        clientWS.on("message", (data, isBinary) => {
          if (proxmoxWS.readyState === WebSocket.OPEN) {
            proxmoxWS.send(data, { binary: isBinary });
          }
        });
        proxmoxWS.on("message", (data, isBinary) => {
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(data, { binary: isBinary });
          }
        });
      });

      proxmoxWS.on("close", () => clientWS.close());
      proxmoxWS.on("error", (err) => {
        console.error("[VNC] Proxmox WS error:", err.message);
        clientWS.close(1011, "Proxmox connection error");
      });

      clientWS.on("close", () => {
        if (proxmoxWS.readyState === WebSocket.OPEN) proxmoxWS.close();
      });
      clientWS.on("error", () => {
        if (proxmoxWS.readyState === WebSocket.OPEN) proxmoxWS.close();
      });

    } catch (err) {
      console.error("[VNC] Failed to create proxy:", err);
      clientWS.close(1011, "Failed to create VNC session");
    }
  });

  return wss;
}
