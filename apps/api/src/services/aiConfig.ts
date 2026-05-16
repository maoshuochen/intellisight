import { env } from "../config/env.js";

export type AiProviderConfig = {
  enabled: boolean;
  apiBase: string;
  apiKey?: string;
  model: string;
  source: "env" | "runtime";
};

let runtimeConfig: AiProviderConfig | null = null;

export function getAiConfig(): AiProviderConfig {
  if (runtimeConfig) return runtimeConfig;
  return {
    enabled: env.AI_ENABLED,
    apiBase: env.AI_API_BASE,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
    source: "env"
  };
}

export function updateAiConfig(config: Omit<AiProviderConfig, "source">) {
  const current = getAiConfig();
  runtimeConfig = { ...config, apiKey: config.apiKey?.trim() || current.apiKey, source: "runtime" };
  return getAiConfig();
}

export function canUseAiModel() {
  const config = getAiConfig();
  return Boolean(config.enabled && config.apiKey);
}
