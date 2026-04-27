import { PreviousOrderDetails } from "../colesTypes";
import { FetchInterceptedMessage } from "../injected/fetchHook";
import { logInfo } from "../logging";

export const isMessageForPreviousOrderDetails = (
  message: FetchInterceptedMessage,
) => {
  return message.url.match(/\/orders\/\d+\/items/) && message.method === "GET";
};

export const handleMessageForPreviousOrderDetails = async (
  message: FetchInterceptedMessage,
) => {
  const previousOrder = message.responseJson as PreviousOrderDetails;
  logInfo("Saving previous order");
  const response = await chrome.runtime.sendMessage({
    command: "save_previous_order",
    params: { previousOrder },
  });
};
