export interface NextRouter {
  push: (url: string) => Promise<void>;
}

export const ROUTER_PUSH_EVENT = "coles:router-push";
export const ROUTER_PUSH_DONE_EVENT = "coles:router-push-done";

const createRequestId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const waitForResponse = async (requestId: string): Promise<void> => {
  return new Promise<void>((resolve) => {
    const onDone = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { requestId?: string }
        | undefined;
      if (detail?.requestId !== requestId) {
        return;
      }
      cleanup();
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      console.warn(`Router push timed out: ${requestId}`);
      resolve();
    }, 10000);

    const cleanup = () => {
      window.removeEventListener(ROUTER_PUSH_DONE_EVENT, onDone);
      window.clearTimeout(timeoutId);
    };

    window.addEventListener(ROUTER_PUSH_DONE_EVENT, onDone);
    window.dispatchEvent(
      new CustomEvent(ROUTER_PUSH_EVENT, { detail: { requestId } })
    );
  });
};

export const nextRouter: NextRouter = {
  push: async (url: string) => {
    const requestId = createRequestId();
    window.dispatchEvent(
      new CustomEvent(ROUTER_PUSH_EVENT, { detail: { url, requestId } })
    );
    await waitForResponse(requestId);
  },
};

let bridgeInjected = false;
export const injectRouterBridge = (): void => {
  if (bridgeInjected) {
    console.log("Router bridge already injected");
    return;
  }
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("dist/injected/nextRouterBridge.js");
  script.type = "module";
  (document.documentElement ?? document.head)?.appendChild(script);
  bridgeInjected = true;
};
