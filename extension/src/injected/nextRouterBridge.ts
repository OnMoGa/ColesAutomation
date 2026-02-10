import {
  NextRouter,
  ROUTER_PUSH_DONE_EVENT,
  ROUTER_PUSH_EVENT,
} from "../nextRouter";

console.log("[ColesAutomation] Next router bridge script loaded");

const getNextRouter = (): NextRouter => {
  return (window as any).next?.router as NextRouter;
};

const waitForPageSettled = async (
  idleMs = 200,
  timeoutMs = 4000
): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  await new Promise<void>((resolve) => {
    const target = document.body ?? document.documentElement;
    if (!target) {
      resolve();
      return;
    }

    let idleTimer: number | undefined;
    const settle = () => {
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
      }
      idleTimer = window.setTimeout(() => {
        cleanup();
        resolve();
      }, idleMs);
    };

    const observer = new MutationObserver(() => {
      settle();
    });
    observer.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    const timeoutTimer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const cleanup = () => {
      observer.disconnect();
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
      }
      window.clearTimeout(timeoutTimer);
    };

    settle();
  });
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
  await router.push(detail.url);
  await waitForPageSettled();
  window.dispatchEvent(
    new CustomEvent(ROUTER_PUSH_DONE_EVENT, {
      detail: { url: detail.url, requestId: detail.requestId },
    })
  );
});
