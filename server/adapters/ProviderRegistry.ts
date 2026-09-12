import { IProviderAdapter, TestResult, GenerateTextOptions, GenerateTextResult, ProviderModality } from "./types";
import { GeminiAdapter } from "./GeminiAdapter";
import { OpenAICompatibleAdapter } from "./OpenAICompatibleAdapter";
import { DoubaoAdapter } from "./DoubaoAdapter";
import { getRealtimeProviders, RealtimeProviderConfig, resolveRealtimeApiKey, resolveTextApiKey } from "../realtimeManager";

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private adapters: Map<string, IProviderAdapter> = new Map();

  private constructor() {
    this.initDefaultAdapters();
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  private initDefaultAdapters() {
    // 1. Google Gemini (Native Unified Multimodal)
    const gemini = new GeminiAdapter();
    this.adapters.set(gemini.id, gemini);

    // 2. OpenAI Realtime / Compatible
    const openai = new OpenAICompatibleAdapter({
      id: "openai-realtime",
      name: "OpenAI Realtime",
      description: "OpenAI Realtime 双工语音与 GPT-4o 文本模型",
      apiKeyEnv: "OPENAI_API_KEY",
      headers: { "OpenAI-Beta": "realtime=v1" },
    });
    this.adapters.set(openai.id, openai);

    // 3. Qwen DashScope (通义千问)
    const qwen = new OpenAICompatibleAdapter({
      id: "qwen-realtime",
      name: "Qwen Realtime (阿里千问)",
      description: "Qwen3.5-Omni / Qwen-Audio-Realtime compatible endpoint",
      apiKeyEnv: "DASHSCOPE_API_KEY",
      textEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      textModel: "qwen-plus",
      realtimeEndpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-flash-realtime",
      realtimeModel: "qwen3.5-omni-flash-realtime",
    });
    this.adapters.set(qwen.id, qwen);

    // 4. 火山引擎 豆包 (Doubao Seed)
    const doubao = new DoubaoAdapter();
    this.adapters.set(doubao.id, doubao);
  }

  public registerAdapter(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): IProviderAdapter {
    const adapter = this.adapters.get(id);
    if (adapter) return adapter;

    // Check configured providers to construct a dynamic OpenAICompatibleAdapter or fallback
    const configured = getRealtimeProviders().find((p) => p.id === id);
    if (configured) {
      if (configured.protocol === "gemini-live" || configured.id === "gemini-live") {
        return this.adapters.get("gemini-live")!;
      }
      if (configured.protocol === "doubao-seed-binary" || configured.id === "doubao-realtime") {
        return this.adapters.get("doubao-realtime")!;
      }
      // Dynamic custom adapter
      const dynamicAdapter = new OpenAICompatibleAdapter({
        id: configured.id,
        name: configured.name,
        description: configured.description,
        apiKeyEnv: configured.apiKeyEnv,
        apiKey: configured.apiKey,
        textEndpoint: configured.textEndpoint,
        textModel: configured.textModel || configured.model,
        realtimeEndpoint: configured.endpoint,
        realtimeModel: configured.model,
        voice: configured.voice,
        headers: configured.headers,
      });
      this.adapters.set(id, dynamicAdapter);
      return dynamicAdapter;
    }

    // Default fallback to Gemini
    return this.adapters.get("gemini-live")!;
  }

  public listAdapters(): IProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  public async testProvider(
    id: string,
    modality?: ProviderModality,
    apiKeyOverride?: string
  ): Promise<TestResult> {
    const adapter = this.getAdapter(id);
    return adapter.testConnection(modality, apiKeyOverride);
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
