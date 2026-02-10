export interface XhrInterceptedMessage {
  __COLES_EXT__: true;
  kind: "XHR_INTERCEPTED";
  method: string;
  url: string;
  responseJson: unknown;
}

if (window.XMLHttpRequest) {
  const OriginalXHR = window.XMLHttpRequest;
  const originalOpen = OriginalXHR.prototype.open;
  const originalSend = OriginalXHR.prototype.send;

  OriginalXHR.prototype.open = function (
    method: string,
    url: string,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    // Stash method and url on the instance for later use
    (this as any).__COLES_METHOD__ = method;
    (this as any).__COLES_URL__ = url;
    return originalOpen.apply(this, arguments as any);
  };

  OriginalXHR.prototype.send = function (body?: Document | BodyInit | null) {
    this.addEventListener("load", function () {
      try {
        let responseJson: unknown = null;

        // Prefer native JSON when responseType is 'json'
        const xhr = this as XMLHttpRequest;
        if (xhr.responseType === "json") {
          responseJson = xhr.response as unknown;
        } else {
          const text = xhr.responseText;
          if (text) {
            try {
              responseJson = JSON.parse(text);
            } catch {
              // Non-JSON response; leave as null to match fetch hook behavior
            }
          }
        }

        const message: XhrInterceptedMessage = {
          __COLES_EXT__: true,
          kind: "XHR_INTERCEPTED",
          method: (this as any).__COLES_METHOD__,
          url: (this as any).__COLES_URL__,
          responseJson,
        };
        window.postMessage(message, "*");
      } catch (e) {
        console.warn("[ColesAutomation] Error intercepting XHR response", e);
      }
    });

    return originalSend.apply(this, arguments as any);
  };

  console.debug("[ColesAutomation] xhr hooked");
} else {
  console.debug("[ColesAutomation] xhr not present");
}
