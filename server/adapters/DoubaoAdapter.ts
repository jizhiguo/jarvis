import { BaseAdapter } from "./BaseAdapter";
import {
  ProviderModality,
  TestResult,
  GenerateTextOptions,
  GenerateTextResult,
} from "./types";

export interface DoubaoConfig {
  id: string;
  name: string;
  description: string;
  speechApiKeyEnv?: string;
  speechApiKey?: string;
  appKey?: string;
  appKeyEnv?: string;
  speechEndpoint?: string;
  speechModel?: string;
  voice?: string;
  textApiKeyEnv?: string;
  textApiKey?: string;
  textEndpoint?: string;
  textModel?: string;
  headers?: Record<string, string>;
}

export class DoubaoAdapter extends BaseAdapter {
  id = "doubao-realtime";
  name = "火山引擎 豆包 (Doubao Seed)";
  description = "字节跳动火山引擎语音大模型 (Doubao Seed Realtime Voice 双工对话) 与火山方舟大模型文本推理矩阵。";
  isUnifiedMultimodal = false;
  supportedModalities: ProviderModality[] = ["realtime", "text"];
  private config: DoubaoConfig;

  defaults = {
    realtime: {
      endpoint: "wss://openspeech.bytedance.com/api/v3/realtime/dialogue",
      model: "O2.0",
      voice: "zh_male_xiaotian_jupiter_bigtts",
      protocol: "doubao-seed-binary",
    },
    text: {
      endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      model: "doubao-seed-2-1-pro-260628",
      protocol: "openai-compatible",
      temperature: 0.7,
    },
  };

  constructor(config?: Partial<DoubaoConfig>) {
    super();
    this.config = {
      id: config?.id || "doubao-realtime",
      name: config?.name || "火山引擎 豆包 (Doubao Seed)",
      description: config?.description || "火山引擎语音与方舟大模型服务",
      speechApiKeyEnv: config?.speechApiKeyEnv || "VOLCENGINE_API_KEY",
      speechApiKey: config?.speechApiKey,
      appKeyEnv: config?.appKeyEnv || "VOLCENGINE_APP_KEY",
      appKey: config?.appKey,
      speechEndpoint: config?.speechEndpoint,
      speechModel: config?.speechModel,
      voice: config?.voice,
      textApiKeyEnv: config?.textApiKeyEnv || "VOLCENGINE_TEXT_API_KEY",
      textApiKey: config?.textApiKey,
      textEndpoint: config?.textEndpoint,
      textModel: config?.textModel,
      headers: config?.headers || {
        "X-Api-Resource-Id": "volc.speech.dialog",
        "X-Api-App-Key": "${VOLCENGINE_APP_KEY}",
      },
    };
  }

  private getTextApiKey(override?: string): string {
    return (
      override ||
      this.resolveEnvValue(this.config.textApiKeyEnv, this.config.textApiKey) ||
      this.resolveEnvValue(this.config.speechApiKeyEnv, this.config.speechApiKey)
    );
  }

  private getTextEndpoint(): string {
    return this.config.textEndpoint || this.defaults.text.endpoint;
  }

  private getTextModel(): string {
    return this.config.textModel || this.defaults.text.model;
  }

  async testConnection(modality?: ProviderModality, apiKeyOverride?: string): Promise<TestResult> {
    const start = Date.now();
    const apiKey = this.getTextApiKey(apiKeyOverride);
    const endpoint = this.getTextEndpoint();
    const model = this.getTextModel();

    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: `缺少火山方舟 API Key (对应环境变量: ${this.config.textApiKeyEnv || "VOLCENGINE_TEXT_API_KEY"})`,
        modality: modality || "text",
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...this.resolveHeaders(this.config.headers),
        },
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
        message: `✓ 成功连接火山方舟文本端点！延时: ${latencyMs}ms`,
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
    const apiKey = this.getTextApiKey(apiKeyOverride);
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
}
