import {
  ClientRequest,
  ClientResponse,
  CommandName,
  RequestParams,
} from "../../shared/protocol";
import { commandHandlers, runCommand } from "./colesDom";

console.log("Content script loaded");

type ContentResponse = Omit<ClientResponse, "id" | "type" | "command">;

chrome.runtime.onMessage.addListener(
  (message: ClientRequest, _sender, sendResponse) => {
    if (!message?.command) {
      sendResponse({
        ok: false,
        error: { code: "NO_COMMAND", message: "Missing command." },
      } satisfies ContentResponse);
      return;
    }

    void (async () => {
      try {
        const result = await runCommand(message.command, message.params);
        sendResponse({ ok: true, result } satisfies ContentResponse);
      } catch (error) {
        sendResponse({
          ok: false,
          error: {
            code: "COMMAND_FAILED",
            message: error instanceof Error ? error.message : "Unknown error.",
          },
        } satisfies ContentResponse);
      }
    })();

    return true;
  }
);
