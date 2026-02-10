export interface FetchInterceptedMessage {
  __COLES_AUTOMATION__: true;
  kind: "FETCH_INTERCEPTED";
  url: string;
  responseJson: unknown;
}

if (window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const resp: Response = await originalFetch(input, init);

    try {
      resp
        .clone()
        .json()
        .then((json) => {
          const message: FetchInterceptedMessage = {
            __COLES_AUTOMATION__: true,
            kind: "FETCH_INTERCEPTED",
            url: input instanceof Request ? input.url : input.toString(),
            responseJson: json,
          };
          window.postMessage(message, "*");
        });
    } catch (e) {
      console.warn("[ColesAutomation] Error cloning response", e);
    }

    return resp;
  };
  console.debug("[ColesAutomation] fetch hooked");
} else {
  console.debug("[ColesAutomation] fetch not present");
}
