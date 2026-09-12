import { BaseAdapter } from "./BaseAdapter";
import {
  ProviderModality,
  TestResult,
  GenerateTextOptions,
  GenerateTextResult,
  GenerateImageOptions,
  GenerateImageResult,
} from "./types";

export interface OpenAICompatibleConfig {
  id: string;
  name: string;
  description: string;
  apiKeyEnv?: string;
  apiKey?: string;
  textEndpoint?: string;
  textModel?: string;
  realtimeEndpoint?: string;
  realtimeModel?: string;
  voice?: string;
  headers?: Record<string, string>;
}

export class OpenAICompatibleAdapter extends BaseAdapter {
  id: string;
  name: string;
  description: string;
  isUnifiedMultimodal = false;
  supportedModalities: ProviderModality[] = ["realtime", "text", "image"];
  private config: OpenAICompatibleConfig;

  defaults = {
    realtime: {
      endpoint: "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      model: "gpt-4o-realtime-preview",
      voice: "alloy",
      protocol: "openai-realtime",
    },
    text: {
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o",
      protocol: "openai-compatible",
      temperature: 0.7,
    },
    image: {
      endpoint: "https://api.openai.com/v1/images/generations",
      model: "dall-e-3",
      aspectRatio: "1:1",
    },
  };

  constructor(config?: Partial<OpenAICompatibleConfig>) {
    super();
    this.config = {
      id: config?.id || "openai-realtime",
      name: config?.name || "OpenAI Compatible",
      description: config?.description || "OpenAI Realtime 与 Chat Completions 兼容端点",
      apiKeyEnv: config?.apiKeyEnv || "OPENAI_API_KEY",
      apiKey: config?.apiKey,
      textEndpoint: config?.textEndpoint,
      textModel: config?.textModel,
      realtimeEndpoint: config?.realtimeEndpoint,
      realtimeModel: config?.realtimeModel,
      voice: config?.voice,
      headers: config?.headers || {},
    };
    this.id = this.config.id;
    this.name = this.config.name;
    this.description = this.config.description;
  }

  private getEffectiveApiKey(override?: string): string {
    return override || this.resolveEnvValue(this.config.apiKeyEnv, this.config.apiKey);
  }

  private getTextEndpoint(): string {
    return this.config.textEndpoint || this.defaults.text.endpoint;
  }

  private getTextModel(): string {
    return this.config.textModel || this.defaults.text.model;
  }

  async testConnection(modality?: ProviderModality, apiKeyOverride?: string): Promise<TestResult> {
    const start = Date.now();
    const apiKey = this.getEffectiveApiKey(apiKeyOverride);
    const endpoint = this.getTextEndpoint();
    const model = this.getTextModel();

    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: `缺少 API Key (对应环境变量: ${this.config.apiKeyEnv || "未设定"})`,
        modality: modality || "text",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...this.resolveHeaders(this.config.headers),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Ping" }],
          max_tokens: 2,
        }),
      });

      const latencyMs = Date.now() - start;
      const data = (await res.json()) as any;

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          message: `连接失败 (HTTP ${res.status}): ${data?.error?.message || res.statusText}`,
          modality: modality || "text",
        };
      }

      return {
        success: true,
        latencyMs,
        message: `✓ 成功连接 ${this.name} 文本端点！延时: ${latencyMs}ms`,
        modality: modality || "text",
        details: { model, endpoint },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        latencyMs,
        message: `网络连通异常 (${latencyMs}ms): ${err?.message || err}`,
        modality: modality || "text",
      };
    }
  }

  async generateText(options: GenerateTextOptions, apiKeyOverride?: string): Promise<GenerateTextResult> {
    const apiKey = this.getEffectiveApiKey(apiKeyOverride);
    const endpoint = this.getTextEndpoint();
    const model = this.getTextModel();

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    for (const msg of options.messages) {
      messages.push({
        role: msg.role === "model" || msg.role === ("jarvis" as any) ? "assistant" : msg.role,
        content: msg.content,
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...this.resolveHeaders(this.config.headers),
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? this.defaults.text.temperature,
      }),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    const reply = data?.choices?.[0]?.message?.content || "At your service, Sir.";
    const usage = data?.usage;

    return {
      reply,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
          }
        : undefined,
    };
  }

  async streamText(
    options: GenerateTextOptions,
    onChunk: (chunk: string) => void,
    apiKeyOverride?: string
  ): Promise<GenerateTextResult> {
    const apiKey = this.getEffectiveApiKey(apiKeyOverride);
    const endpoint = this.getTextEndpoint();
    const model = this.getTextModel();

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    for (const msg of options.messages) {
      messages.push({
        role: msg.role === "model" || msg.role === ("jarvis" as any) ? "assistant" : msg.role,
        content: msg.content,
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...this.resolveHeaders(this.config.headers),
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? this.defaults.text.temperature,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Streaming failed (HTTP ${res.status}): ${err}`);
    }

    if (!res.body) {
      throw new Error("Response body is empty.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullReply = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (trimmed === "data: [DONE]") break;
        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed?.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullReply += delta;
              onChunk(delta);
            }
          } catch {}
        }
      }
    }

    return { reply: fullReply };
  }
}
