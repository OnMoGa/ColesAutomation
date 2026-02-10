const injectedScripts = new Set<string>();
export const injectPageScript = (resourcePath: string): void => {
  if (injectedScripts.has(resourcePath)) {
    console.log("[ColesAutomation] Script already injected:", resourcePath);
    return;
  }
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(resourcePath);
    script.type = "text/javascript";
    script.setAttribute("data-coles-automation", "true");
    (document.documentElement || document.head || document.body).appendChild(
      script
    );
    injectedScripts.add(resourcePath);
    console.log("[ColesAutomation] Script injected:", resourcePath);
  } catch (e) {
    console.warn("[ColesAutomation] Failed to inject script:", resourcePath, e);
  }
};
