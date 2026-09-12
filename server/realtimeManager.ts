import fs from "fs";
import path from "path";
import "dotenv/config";
import { providerRegistry } from "./adapters/ProviderRegistry";
import { ProviderModality, TestResult } from "./adapters/types";

export type RealtimeProtocol = "gemini-live" | "openai-realtime" | "websocket-json" | "doubao-seed-binary";
export type TextProtocol = "gemini" | "openai-compatible";

export interface RealtimeProviderConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  isUnifiedMultimodal?: boolean;
  supportedModalities?: ProviderModality[];
  
  // Realtime Audio Modality
  protocol: RealtimeProtocol;
  endpoint: string;
  model: string;
  voice?: string;
  apiKeyEnv?: string;
  apiKey?: string;
  
  // Text Modality
  textProtocol?: TextProtocol;
  textEndpoint?: string;
  textModel?: string;
  textApiKeyEnv?: string;
  textApiKey?: string;
  temperature?: number;

  // Image Modality
  imageEndpoint?: string;
  imageModel?: string;
  imageApiKeyEnv?: string;
  imageApiKey?: string;

  // Video Modality
  videoModel?: string;

  // Headers & System
  headers: Record<string, string>;
  systemInstruction?: string;

  // Default Watermark Hints
  defaults?: {
    realtime?: {
      endpoint?: string;
      model?: string;
      voice?: string;
      protocol?: string;
    };
    text?: {
      endpoint?: string;
      model?: string;
      protocol?: string;
      temperature?: number;
    };
    image?: {
      endpoint?: string;
      model?: string;
      aspectRatio?: string;
    };
    video?: {
      model?: string;
    };
  };
}

const configPath = path.join(process.cwd(), "config", "realtime.providers.json");

function loadProviders(): RealtimeProviderConfig[] {
  try {
    const list = JSON.parse(fs.readFileSync(configPath, "utf8")) as RealtimeProviderConfig[];
    // Ensure gemini-live or at least one primary provider is enabled
    if (!list.some((p) => p.enabled)) {
      const gemini = list.find((p) => p.id === "gemini-live") || list[0];
      if (gemini) gemini.enabled = true;
    }
    return list;
  } catch {
    return [
      {
        id: "gemini-live",
        name: "Google Gemini (原生统一多模态)",
        description: "Google Gemini Live API 全模态模型",
        isUnifiedMultimodal: true,
        supportedModalities: ["realtime", "text", "image", "video"],
        enabled: true,
        protocol: "gemini-live",
        endpoint: "",
        model: "gemini-3.1-flash-live-preview",
        apiKeyEnv: "GEMINI_API_KEY",
        headers: {},
        voice: "Fenrir",
        textProtocol: "gemini",
        textModel: "gemini-3.8-flash",
        imageModel: "gemini-3.1-flash-image",
        videoModel: "gemini-3.8-flash",
        temperature: 0.7,
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
  if (id) {
    const target = providers.find((provider) => provider.id === id);
    if (target) {
      if (target.enabled) return target;
      // If it is gemini-live or the user specifically selected it, auto-enable or fallback
      if (id === "gemini-live") {
        target.enabled = true;
        saveProviders();
        return target;
      }
      const enabledFallback = providers.find((p) => p.enabled);
      if (enabledFallback) {
        console.warn(`[RealtimeManager] Provider '${id}' is disabled; falling back to enabled provider '${enabledFallback.id}'`);
        return enabledFallback;
      }
      target.enabled = true;
      saveProviders();
      return target;
    }
  }
  const fallback = providers.find((provider) => provider.enabled) || providers.find((p) => p.id === "gemini-live") || providers[0];
  if (!fallback) throw new Error("No realtime provider is configured.");
  return fallback;
}

export function resolveRealtimeApiKey(provider: RealtimeProviderConfig): string | undefined {
  return provider.apiKey || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined);
}

export function resolveTextApiKey(provider: RealtimeProviderConfig): string | undefined {
  return provider.textApiKey || (provider.textApiKeyEnv ? process.env[provider.textApiKeyEnv] : undefined);
}

export function resolveImageApiKey(provider: RealtimeProviderConfig): string | undefined {
  return provider.imageApiKey || (provider.imageApiKeyEnv ? process.env[provider.imageApiKeyEnv] : undefined);
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

  // Preserve sensitive keys if untouched or masked
  const finalApiKey =
    update.apiKey === "********" || typeof update.apiKey === "undefined"
      ? current.apiKey
      : update.apiKey;

  const finalTextApiKey =
    update.textApiKey === "********" || typeof update.textApiKey === "undefined"
      ? current.textApiKey
      : update.textApiKey;

  const finalImageApiKey =
    update.imageApiKey === "********" || typeof update.imageApiKey === "undefined"
      ? current.imageApiKey
      : update.imageApiKey;

  // Merge headers safely
  const mergedHeaders = { ...current.headers };
  if (update.headers) {
    for (const [key, val] of Object.entries(update.headers)) {
      if (val === "********" && current.headers[key]) {
        // Keep existing header value
        continue;
      }
      mergedHeaders[key] = val;
    }
  }

  providers[index] = {
    ...current,
    ...update,
    id: current.id,
    apiKey: finalApiKey,
    textApiKey: finalTextApiKey,
    imageApiKey: finalImageApiKey,
    headers: mergedHeaders,
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
    imageApiKey: provider.imageApiKey ? "********" : undefined,
    hasApiKey: Boolean(resolveRealtimeApiKey(provider)),
    hasTextApiKey: Boolean(resolveTextApiKey(provider)),
    hasImageApiKey: Boolean(resolveImageApiKey(provider)),
  };
}

export async function testProviderHealth(
  id: string,
  modality?: ProviderModality,
  apiKeyOverride?: string
): Promise<TestResult> {
  return providerRegistry.testProvider(id, modality, apiKeyOverride);
}
