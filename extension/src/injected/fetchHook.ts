export interface FetchInterceptedMessage {
  __COLES_AUTOMATION__: true;
  kind: "FETCH_INTERCEPTED";
  url: string;
  method: string;
  responseJson: unknown;
}

if (window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const resp: Response = await originalFetch(input, init);
    const clonedResponse = resp.clone();

    try {
      clonedResponse
        .json()
        .then((json) => {
          const message: FetchInterceptedMessage = {
            __COLES_AUTOMATION__: true,
            kind: "FETCH_INTERCEPTED",
            url: input instanceof Request ? input.url : input.toString(),
            method: init?.method ?? "GET",
            responseJson: json,
          };
          window.postMessage(message, "*");
        })
        .catch((e) => {
          console.debug("[ColesAutomation] Error parsing response", e);
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
