import {
  ClientRequest,
  ClientResponse,
  CommandName,
  ResponseError,
  TransportPingMessage,
  TransportPongMessage,
} from "../../../shared/protocol";
import { logError, logInfo } from "../logging";
import { getActiveColesTab } from "./background";
import { getConfig } from "./config";

let socket: WebSocket | null = null;
let connecting = false;
let reconnectTimer: number | null = null;

/** Detect half-open sockets when the MCP process is gone but TCP stays up. */
const HEARTBEAT_INTERVAL_MS = 1_000;
const HEARTBEAT_TIMEOUT_MS = 4_000;

let heartbeatTimer: number | null = null;
let pingDeadlineTimer: number | null = null;
let pendingPingId: string | null = null;

type ConnectionStatus = "connected" | "disconnected" | "connecting";

let currentStatus: ConnectionStatus | null = null;

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: "#22c55e",
  disconnected: "#ef4444",
  connecting: "#f59e0b",
};

const unregisterListeners = (ws: WebSocket) => {
  ws.onopen = null;
  ws.onclose = null;
  ws.onerror = null;
  ws.onmessage = null;
};

const clearHeartbeat = () => {
  if (heartbeatTimer !== null) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (pingDeadlineTimer !== null) {
    clearTimeout(pingDeadlineTimer);
    pingDeadlineTimer = null;
  }
  pendingPingId = null;
};

const scheduleNextHeartbeat = (ws: WebSocket) => {
  if (heartbeatTimer !== null) {
    clearTimeout(heartbeatTimer);
  }
  heartbeatTimer = setTimeout(() => {
    heartbeatTimer = null;
    sendHeartbeatPing(ws);
  }, HEARTBEAT_INTERVAL_MS) as unknown as number;
};

const sendHeartbeatPing = (ws: WebSocket) => {
  if (socket !== ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  if (pendingPingId !== null) {
    forceDisconnect(ws, "WebSocket heartbeat: previous ping unanswered");
    return;
  }
  const id = crypto.randomUUID();
  pendingPingId = id;
  pingDeadlineTimer = setTimeout(() => {
    pingDeadlineTimer = null;
    forceDisconnect(ws, "WebSocket heartbeat: ping timeout");
  }, HEARTBEAT_TIMEOUT_MS) as unknown as number;
  try {
    const ping: TransportPingMessage = { type: "ping", id };
    ws.send(JSON.stringify(ping));
  } catch (error) {
    logError("WebSocket heartbeat: send failed", error);
    forceDisconnect(ws, "WebSocket heartbeat: send failed");
    return;
  }
  scheduleNextHeartbeat(ws);
};

const forceDisconnect = (ws: WebSocket, reason: string) => {
  if (socket !== ws) {
    return;
  }
  clearHeartbeat();
  logInfo(reason);
  unregisterListeners(ws);
  socket = null;
  connecting = false;
  updateStatusIcon("disconnected");
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(4000, "Heartbeat failed");
    }
  } catch {
    // ignore
  }
  scheduleReconnect();
};

/**
 * Swallows pong frames so handleSocketMessage does not log them as malformed.
 * Returns true if `raw` parsed as JSON with type "pong".
 */
const tryHandlePong = (raw: string, expectedWs: WebSocket): boolean => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  if (typeof parsed !== "object" || parsed === null || (parsed as { type?: unknown }).type !== "pong") {
    return false;
  }
  const id = (parsed as Partial<TransportPongMessage>).id;
  if (typeof id !== "string") {
    return true;
  }
  if (socket === expectedWs && pendingPingId === id && pingDeadlineTimer !== null) {
    clearTimeout(pingDeadlineTimer);
    pingDeadlineTimer = null;
    pendingPingId = null;
  }
  return true;
};

export const connectSocket = async () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }
  if (connecting) {
    return;
  }
  connecting = true;
  updateStatusIcon("connecting");

  let url: string;
  try {
    const { port, token } = await getConfig();
    url = `ws://localhost:${port}/?token=${encodeURIComponent(token)}`;
  } catch (error) {
    connecting = false;
    logError("WebSocket: failed to read config", error);
    updateStatusIcon("disconnected");
    scheduleReconnect();
    return;
  }

  if (socket) {
    const old = socket;
    unregisterListeners(old);
    socket = null;
    clearHeartbeat();
    try {
      if (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING) {
        old.close();
      }
    } catch {
      // ignore
    }
  }

  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    if (socket !== ws) {
      return;
    }
    connecting = false;
    logInfo("WebSocket connected");
    updateStatusIcon("connected");
    sendHeartbeatPing(ws);
  };

  ws.onclose = () => {
    if (socket !== ws) {
      return;
    }
    clearHeartbeat();
    connecting = false;
    socket = null;
    logInfo("WebSocket disconnected");
    updateStatusIcon("disconnected");
    scheduleReconnect();
  };

  ws.onerror = (event) => {
    if (socket !== ws) {
      return;
    }
    connecting = false;
    logError("WebSocket error", event);
    updateStatusIcon("disconnected");
  };

  ws.onmessage = (event) => {
    if (socket !== ws) {
      return;
    }
    const data = typeof event.data === "string" ? event.data : null;
    if (data !== null && tryHandlePong(data, ws)) {
      return;
    }
    const payload = typeof event.data === "string" ? event.data : "";
    void handleSocketMessage(payload);
  };
};

const scheduleReconnect = () => {
  if (reconnectTimer !== null) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectSocket();
  }, 1000) as unknown as number;
};

const forwardToContentScript = async (command: CommandName, params: ClientRequest["params"]) => {
  const tab = await getActiveColesTab();
  if (!tab?.id) {
    const error: ResponseError = {
      code: "NO_COLES_TAB",
      message: "No active Coles tab found.",
    };
    return { ok: false, error };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      command,
      params,
    });
    if (!response || typeof response.ok !== "boolean") {
      return {
        ok: false,
        error: { code: "BAD_CONTENT_RESPONSE", message: "Invalid response." },
      };
    }
    return response;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "CONTENT_SCRIPT_ERROR",
        message: error instanceof Error ? error.message : "Unknown error.",
      },
    };
  }
};

const handleSocketMessage = async (raw: string) => {
  let message: ClientRequest;
  try {
    message = JSON.parse(raw) as ClientRequest;
  } catch (error) {
    logError("Error in handleSocketMessage: Invalid JSON from MCP server", error);
    return;
  }

  if (message?.type !== "request" || !message.command || !message.id) {
    logError("Error in handleSocketMessage: Malformed request", message);
    return;
  }

  const responsePayload = await forwardToContentScript(message.command, message.params);

  const response: ClientResponse = {
    id: message.id,
    type: "response",
    command: message.command,
    ok: responsePayload.ok,
    result: responsePayload.ok ? responsePayload.result : undefined,
    error: responsePayload.ok ? undefined : responsePayload.error,
  };

  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(response));
    } catch (error) {
      logError("WebSocket: failed to send response", error);
    }
  }
};

const updateStatusIcon = (status: ConnectionStatus) => {
  if (currentStatus === status) {
    return;
  }
  currentStatus = status;
  const color = STATUS_COLORS[status];
  const imageData = {
    16: drawStatusIcon(color, 16),
    32: drawStatusIcon(color, 32),
  };
  chrome.action.setIcon({ imageData });
};

const drawStatusIcon = (color: string, size: number) => {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create canvas context.");
  }
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
};
