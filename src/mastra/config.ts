export function getConfig() {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const modelName = process.env.MODEL_NAME;

  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  if (!modelName) {
    throw new Error("MODEL_NAME is not configured.");
  }

  return {
    openRouterApiKey,
    modelName,
  } as const;
}