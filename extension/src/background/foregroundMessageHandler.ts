import { PreviousOrderDetails } from "../colesTypes";
import { logInfo } from "../logging";

export const listenForForegroundMessages = () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    logInfo("Received message from foreground", { request, sender });
    const senderUrl = sender.url ?? sender.tab?.url;
    if (!senderUrl?.startsWith("https://www.coles.com.au/")) {
      sendResponse({ ok: false, error: "Invalid sender URL." });
      return;
    }

    if (request?.command === "save_previous_order") {
      const previousOrder = request?.params?.previousOrder as PreviousOrderDetails;
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown command." });
  });
};
