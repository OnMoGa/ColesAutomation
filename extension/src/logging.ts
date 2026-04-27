export const logInfo = (message: string, meta?: unknown) => {
  if (meta) {
    console.info(`[ColesAutomation] ${message}`, meta);
  } else {
    console.info(`[ColesAutomation] ${message}`);
  }
};

export const logError = (message: string, meta?: unknown) => {
  if (meta) {
    console.error(`[ColesAutomation] ${message}`, meta);
  } else {
    console.error(`[ColesAutomation] ${message}`);
  }
};
