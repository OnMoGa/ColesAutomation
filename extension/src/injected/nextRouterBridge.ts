import {
  NextRouter,
  ROUTER_PUSH_DONE_EVENT,
  ROUTER_PUSH_EVENT,
} from "../nextRouter";

console.log("[ColesAutomation] Next router bridge script loaded");

const getNextRouter = (): NextRouter => {
  return (window as any).next?.router as NextRouter;
};

window.addEventListener(ROUTER_PUSH_EVENT, async (event: Event) => {
  const detail = (event as CustomEvent).detail as
    | { url?: string; requestId?: string }
    | undefined;
  if (!detail?.url) {
    return;
  }

  const router = getNextRouter();
  if (!router?.push) {
    throw new Error("Next router not available on page.");
  }

  const p = new Promise<void>((resolve) => {
    const callback = (url: string) => {
      resolve();
      getNextRouter().events.off("routeChangeComplete", callback);
    };
    getNextRouter().events.on("routeChangeComplete", callback);
  });

  console.log("[ColesAutomation] Navigating to", detail.url);
  await router.push(detail.url);
  console.log("[ColesAutomation] Waiting for page to settle");
  await p;
  console.log("[ColesAutomation] Page settled");
  window.dispatchEvent(
    new CustomEvent(ROUTER_PUSH_DONE_EVENT, {
      detail: { url: detail.url, requestId: detail.requestId },
    }),
  );
});
