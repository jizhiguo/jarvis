import fs from "fs";
import path from "path";
import "dotenv/config";

export type RealtimeProtocol = "gemini-live" | "openai-realtime" | "websocket-json" | "doubao-seed-binary";
export type TextProtocol = "gemini" | "openai-compatible";

export interface RealtimeProviderConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  protocol: RealtimeProtocol;
  endpoint: string;
  model: string;
  apiKeyEnv?: string;
  apiKey?: string;
  textApiKeyEnv?: string;
  textApiKey?: string;
  headers: Record<string, string>;
  voice?: string;
  systemInstruction?: string;
  textProtocol?: TextProtocol;
  textEndpoint?: string;
  textModel?: string;
}

const configPath = path.join(process.cwd(), "config", "realtime.providers.json");

function loadProviders(): RealtimeProviderConfig[] {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as RealtimeProviderConfig[];
  } catch {
    return [
      {
        id: "gemini-live",
        name: "Gemini Live",
        description: "Google Gemini Live API",
        enabled: true,
        protocol: "gemini-live",
        endpoint: "",
        model: "gemini-3.1-flash-live-preview",
        apiKeyEnv: "GEMINI_API_KEY",
        headers: {},
        voice: "Fenrir",
      },
    ];
  }
}

let providers = loadProviders();

function saveProviders(): void {
  fs.writeFileSync(configPath, `${JSON.stringify(providers, null, 2)}\n`, "utf8");
}

export function getRealtimeProviders(): RealtimeProviderConfig[] {
  return providers;
}

export function getRealtimeProvider(id?: string): RealtimeProviderConfig {
  const selected = providers.find((provider) => provider.id === id && provider.enabled);
  const fallback = providers.find((provider) => provider.enabled) || providers[0];
  if (!selected && id) throw new Error(`Realtime provider '${id}' is not enabled or does not exist.`);
  if (!fallback) throw new Error("No realtime provider is configured.");
  return selected || fallback;
}

export function resolveRealtimeApiKey(provider: RealtimeProviderConfig): string | undefined {
  return provider.apiKey || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined);
}

export function resolveTextApiKey(provider: RealtimeProviderConfig): string | undefined {
  return provider.textApiKey || (provider.textApiKeyEnv ? process.env[provider.textApiKeyEnv] : undefined);
}

export function resolveProviderHeaders(provider: RealtimeProviderConfig): Record<string, string> {
  return Object.fromEntries(
    Object.entries(provider.headers || {}).map(([name, value]) => [
      name,
      value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, envName: string) => process.env[envName] || ""),
    ])
  );
}

export function updateRealtimeProvider(
  id: string,
  update: Partial<RealtimeProviderConfig>
): RealtimeProviderConfig {
  const index = providers.findIndex((provider) => provider.id === id);
  if (index < 0) throw new Error(`Realtime provider '${id}' does not exist.`);
  const current = providers[index];
  providers[index] = {
    ...current,
    ...update,
    id: current.id,
    apiKey: update.apiKey === "********" || typeof update.apiKey === "undefined" ? current.apiKey : update.apiKey,
    textApiKey: update.textApiKey === "********" || typeof update.textApiKey === "undefined" ? current.textApiKey : update.textApiKey,
    headers: { ...current.headers, ...(update.headers || {}) },
  };
  saveProviders();
  return providers[index];
}

export function addRealtimeProvider(provider: RealtimeProviderConfig): RealtimeProviderConfig {
  if (!provider.id || providers.some((item) => item.id === provider.id)) {
    throw new Error("Realtime provider id must be unique and non-empty.");
  }
  providers.push({ ...provider, headers: provider.headers || {} });
  saveProviders();
  return provider;
}

export function publicRealtimeProvider(provider: RealtimeProviderConfig) {
  return {
    ...provider,
    apiKey: provider.apiKey ? "********" : undefined,
    textApiKey: provider.textApiKey ? "********" : undefined,
    textApiKeyEnv: provider.textApiKeyEnv,
    hasApiKey: Boolean(resolveRealtimeApiKey(provider)),
    hasTextApiKey: Boolean(resolveTextApiKey(provider)),
  };
}
