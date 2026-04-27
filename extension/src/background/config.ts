type StoredConfig = {
  port: number;
  token: string;
};

export const DEFAULT_CONFIG: StoredConfig = {
  port: 7357,
  token: "coles-dev-token",
};

export const getConfig = async (): Promise<StoredConfig> => {
  const result = await chrome.storage.local.get(DEFAULT_CONFIG);
  return {
    port: typeof result.port === "number" ? result.port : DEFAULT_CONFIG.port,
    token:
      typeof result.token === "string" ? result.token : DEFAULT_CONFIG.token,
  };
};
