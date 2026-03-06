import { useEffect, useRef, useState, useCallback } from "react";
import type { VMStatus, NodeStatus } from "../api/client";

export type WSStatus = "connecting" | "connected" | "disconnected" | "error";

export interface MetricsPayload {
  vms: VMStatus[];
  nodeStatus: NodeStatus;
}

export function useMetricsWS() {
  const [status, setStatus] = useState<WSStatus>("connecting");
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const token = localStorage.getItem("proxmon_token") || "";
    const url = `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "metrics") {
          setMetrics(msg.payload as MetricsPayload);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("error");
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      reconnectRef.current = setTimeout(connect, 4000);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, metrics };
}
