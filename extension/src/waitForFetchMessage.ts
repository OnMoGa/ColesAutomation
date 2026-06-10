import { FetchInterceptedMessage } from "./injected/fetchHook";

export const waitForFetchMessage = async (testFunction: (message: FetchInterceptedMessage) => boolean) => {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as any;
      if (!data || data.__COLES_AUTOMATION__ !== true) return;
      if (data.kind === "FETCH_INTERCEPTED") {
        const fetchInterceptedMessage = data as FetchInterceptedMessage;
        if (testFunction(fetchInterceptedMessage)) {
          resolve(fetchInterceptedMessage.responseJson);
          window.removeEventListener("message", handler);
        }
      }
    };
    window.addEventListener("message", handler);
  });
};
