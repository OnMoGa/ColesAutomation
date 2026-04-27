import {
  ClientRequest,
  ClientResponse,
  CommandName,
  ResponseError,
} from "../../../shared/protocol";
import { logError, logInfo } from "../logging";
import { getActiveColesTab } from "./background";
import { getConfig } from "./config";

let socket: WebSocket | null = null;
let connecting = false;
let reconnectTimer: number | null = null;

type ConnectionStatus = "connected" | "disconnected" | "connecting";

let currentStatus: ConnectionStatus | null = null;

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: "#22c55e",
  disconnected: "#ef4444",
  connecting: "#f59e0b",
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
  const { port, token } = await getConfig();
  const url = `ws://localhost:${port}/?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    connecting = false;
    logInfo("WebSocket connected");
    updateStatusIcon("connected");
  };

  socket.onclose = () => {
    connecting = false;
    logInfo("WebSocket disconnected");
    updateStatusIcon("disconnected");
    scheduleReconnect();
  };

  socket.onerror = (event) => {
    connecting = false;
    logError("WebSocket error", event);
    updateStatusIcon("disconnected");
    scheduleReconnect();
  };

  socket.onmessage = (event) => {
    void handleSocketMessage(event.data);
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

const forwardToContentScript = async (
  command: CommandName,
  params: ClientRequest["params"],
) => {
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
    logError(
      "Error in handleSocketMessage: Invalid JSON from MCP server",
      error,
    );
    return;
  }

  if (message?.type !== "request" || !message.command || !message.id) {
    logError("Error in handleSocketMessage: Malformed request", message);
    return;
  }

  const responsePayload = await forwardToContentScript(
    message.command,
    message.params,
  );

  const response: ClientResponse = {
    id: message.id,
    type: "response",
    command: message.command,
    ok: responsePayload.ok,
    result: responsePayload.ok ? responsePayload.result : undefined,
    error: responsePayload.ok ? undefined : responsePayload.error,
  };

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(response));
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
