import WebSocket from "ws";
import http from "http";

export type ProviderModality = "realtime" | "text" | "image" | "video";

export interface TestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  modality?: ProviderModality;
  details?: Record<string, any>;
}

export interface TextMessage {
  role: "system" | "user" | "assistant" | "model";
  content: string;
}

export interface GenerateTextOptions {
  messages: TextMessage[];
  systemInstruction?: string;
  temperature?: number;
  tools?: any[];
  stream?: boolean;
}

export interface GenerateTextResult {
  reply: string;
  sources?: Array<{ title: string; url: string }>;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface GenerateImageOptions {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  model?: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  model: string;
}

export interface IProviderAdapter {
  id: string;
  name: string;
  description: string;
  isUnifiedMultimodal: boolean; // true for Gemini (one model family handles all modalities)
  supportedModalities: ProviderModality[];
  
  // Modality Default Fallback Values
  defaults: {
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

  // Connection and API health test
  testConnection(modality?: ProviderModality, apiKeyOverride?: string): Promise<TestResult>;

  // Text / LLM Generation
  generateText(options: GenerateTextOptions, apiKeyOverride?: string): Promise<GenerateTextResult>;

  // Streaming text generation via SSE / HTTP chunking
  streamText?(
    options: GenerateTextOptions,
    onChunk: (chunk: string) => void,
    apiKeyOverride?: string
  ): Promise<GenerateTextResult>;

  // Visual image generation
  generateImage?(options: GenerateImageOptions, apiKeyOverride?: string): Promise<GenerateImageResult>;

  // Realtime Audio WebSocket Session Handler
  handleRealtimeSession?(
    clientWs: WebSocket,
    req: http.IncomingMessage,
    options?: any
  ): Promise<void>;
}
