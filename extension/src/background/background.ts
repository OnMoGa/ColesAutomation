import { logError, logInfo } from "../logging";
import { DEFAULT_CONFIG } from "./config";
import { listenForForegroundMessages } from "./foregroundMessageHandler";
import { connectSocket } from "./webSocketHandler";

console.log("[ColesAutomation] Background script loaded");

const reinjectContentScripts = async () => {
  const tabs = await chrome.tabs.query({
    url: "https://www.coles.com.au/*",
  });
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) {
        return;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["dist/content.js"],
        });
        logInfo("Reinjected content script", { tabId: tab.id });
      } catch (error) {
        logError("Failed to re-inject content script", {
          tabId: tab.id,
          error,
        });
      }
    }),
  );
};

export const getActiveColesTab = async (): Promise<chrome.tabs.Tab | null> => {
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
};

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set(DEFAULT_CONFIG);
  void reinjectContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  void reinjectContentScripts();
});

void reinjectContentScripts();
void connectSocket();
listenForForegroundMessages();
