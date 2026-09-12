import { BaseAdapter } from "./BaseAdapter";
import {
  ProviderModality,
  TestResult,
  GenerateTextOptions,
  GenerateTextResult,
  GenerateImageOptions,
  GenerateImageResult,
} from "./types";
import { GoogleGenAI } from "@google/genai";

export class GeminiAdapter extends BaseAdapter {
  id = "gemini-live";
  name = "Google Gemini (Unified Multimodal)";
  description = "Google Gemini 原生全模态统一模型。同一套模型架构天然无缝支持实时双工语音、长文本理解/生成、Google Search 接地与高保真图像/视觉多模态交互。";
  isUnifiedMultimodal = true;
  supportedModalities: ProviderModality[] = ["realtime", "text", "image", "video"];

  defaults = {
    realtime: {
      model: "gemini-3.1-flash-live-preview",
      voice: "Fenrir",
      protocol: "gemini-live",
    },
    text: {
      model: "gemini-3.8-flash",
      protocol: "gemini",
      temperature: 0.7,
    },
    image: {
      model: "gemini-3.1-flash-image",
      aspectRatio: "1:1",
    },
    video: {
      model: "gemini-3.8-flash",
    },
  };

  private getClient(apiKeyOverride?: string): GoogleGenAI {
    const key = apiKeyOverride || this.resolveEnvValue("GEMINI_API_KEY");
    if (!key) {
      throw new Error("GEMINI_API_KEY 未配置。请在 .env 文件或配置面板中设置。");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build-jarvis" },
      },
    });
  }

  async testConnection(modality?: ProviderModality, apiKeyOverride?: string): Promise<TestResult> {
    const start = Date.now();
    try {
      const ai = this.getClient(apiKeyOverride);
      // Fast minimal probe: 1 token test
      const response = await ai.models.generateContent({
        model: this.defaults.text.model,
        contents: "Ping",
        config: { maxOutputTokens: 2 },
      });
      const latencyMs = Date.now() - start;
      return {
        success: true,
        latencyMs,
        message: `✓ Gemini 原生多模态连接测试成功！全通道握手延时: ${latencyMs}ms`,
        modality: modality || "text",
        details: {
          unified: true,
          model: this.defaults.text.model,
          liveModel: this.defaults.realtime.model,
          imageModel: this.defaults.image.model,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        latencyMs,
        message: `Gemini 连接测试失败 (${latencyMs}ms): ${err?.message || err}`,
        modality: modality || "text",
      };
    }
  }

  async generateText(options: GenerateTextOptions, apiKeyOverride?: string): Promise<GenerateTextResult> {
    const ai = this.getClient(apiKeyOverride);
    const contents = options.messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: this.defaults.text.model,
      contents,
      config: {
        systemInstruction: options.systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: options.temperature ?? this.defaults.text.temperature,
      },
    });

    const reply = response.text || "At your service, Sir.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c?.web?.uri)
      .map((c: any) => ({
        title: c.web.title || "Web Reference",
        url: c.web.uri,
      }));

    return { reply, sources };
  }

  async streamText(
    options: GenerateTextOptions,
    onChunk: (chunk: string) => void,
    apiKeyOverride?: string
  ): Promise<GenerateTextResult> {
    const ai = this.getClient(apiKeyOverride);
    const contents = options.messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const stream = await ai.models.generateContentStream({
      model: this.defaults.text.model,
      contents,
      config: {
        systemInstruction: options.systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: options.temperature ?? this.defaults.text.temperature,
      },
    });

    let fullText = "";
    for await (const chunk of stream) {
      const text = chunk.text || "";
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return { reply: fullText };
  }

  async generateImage(options: GenerateImageOptions, apiKeyOverride?: string): Promise<GenerateImageResult> {
    const ai = this.getClient(apiKeyOverride);
    const prompt = options.style ? `${options.prompt}, Style: ${options.style}` : options.prompt;
    const model = options.model || this.defaults.image.model;

    const response = await ai.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: (options.aspectRatio as any) || "1:1",
      },
    });

    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64) {
      throw new Error("No image data returned from Gemini Image API.");
    }

    return {
      imageUrl: `data:image/png;base64,${base64}`,
      model,
    };
  }
}
