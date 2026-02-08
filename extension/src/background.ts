import {
  ClientRequest,
  ClientResponse,
  CommandName,
  ResponseError,
} from "../../shared/protocol";

console.log("Background script loaded");

type StoredConfig = {
  port: number;
  token: string;
};

const DEFAULT_CONFIG: StoredConfig = {
  port: 7357,
  token: "coles-dev-token",
};

let socket: WebSocket | null = null;
let connecting = false;
let reconnectTimer: number | null = null;

function logInfo(message: string, meta?: unknown) {
  if (meta) {
    console.info(`[coles-extension] ${message}`, meta);
  } else {
    console.info(`[coles-extension] ${message}`);
  }
}

function logError(message: string, meta?: unknown) {
  if (meta) {
    console.error(`[coles-extension] ${message}`, meta);
  } else {
    console.error(`[coles-extension] ${message}`);
  }
}

async function getConfig(): Promise<StoredConfig> {
  const result = await chrome.storage.local.get(DEFAULT_CONFIG);
  return {
    port: typeof result.port === "number" ? result.port : DEFAULT_CONFIG.port,
    token:
      typeof result.token === "string" ? result.token : DEFAULT_CONFIG.token,
  };
}

async function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }
  if (connecting) {
    return;
  }
  connecting = true;
  const { port, token } = await getConfig();
  const url = `ws://localhost:${port}/?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    connecting = false;
    logInfo("WebSocket connected");
  };

  socket.onclose = () => {
    connecting = false;
    logInfo("WebSocket disconnected");
    scheduleReconnect();
  };

  socket.onerror = (event) => {
    connecting = false;
    logError("WebSocket error", event);
    scheduleReconnect();
  };

  socket.onmessage = (event) => {
    void handleSocketMessage(event.data);
  };
}

function scheduleReconnect() {
  if (reconnectTimer !== null) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectSocket();
  }, 1500) as unknown as number;
}

async function getActiveColesTab(): Promise<chrome.tabs.Tab | null> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (activeTab?.url && activeTab.url.includes("https://www.coles.com.au/")) {
    return activeTab;
  }
  const tabs = await chrome.tabs.query({
    url: "https://www.coles.com.au/*",
  });
  return tabs.length > 0 ? tabs[0] : null;
}

async function forwardToContentScript(
  command: CommandName,
  params: ClientRequest["params"]
) {
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
}

async function handleSocketMessage(raw: string) {
  let message: ClientRequest;
  try {
    message = JSON.parse(raw) as ClientRequest;
  } catch (error) {
    logError("Invalid JSON from MCP server", error);
    return;
  }

  if (message?.type !== "request" || !message.command || !message.id) {
    logError("Malformed request", message);
    return;
  }

  const responsePayload = await forwardToContentScript(
    message.command,
    message.params
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
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set(DEFAULT_CONFIG);
});

void connectSocket();
