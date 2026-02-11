import { nextRouter } from "./nextRouter";

console.log("[ColesAutomation] Coles DOM script loaded");

export const COLES_ORIGIN = "https://www.coles.com.au";

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const navigateTo = async (url: string) => {
  await nextRouter.push(url);
};
