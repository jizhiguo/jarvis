import { IProviderAdapter, ProviderModality, TestResult, GenerateTextOptions, GenerateTextResult } from "./types";
import dotenv from "dotenv";

dotenv.config();

export abstract class BaseAdapter implements IProviderAdapter {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract isUnifiedMultimodal: boolean;
  abstract supportedModalities: ProviderModality[];
  abstract defaults: IProviderAdapter["defaults"];

  protected resolveEnvValue(envKey?: string, directValue?: string): string {
    if (directValue && directValue !== "********") return directValue;
    if (envKey && process.env[envKey]) return process.env[envKey] as string;
    return "";
  }

  protected resolveHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [
        name,
        value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, envName: string) => process.env[envName] || ""),
      ])
    );
  }

  abstract testConnection(modality?: ProviderModality, apiKeyOverride?: string): Promise<TestResult>;
  abstract generateText(options: GenerateTextOptions, apiKeyOverride?: string): Promise<GenerateTextResult>;
}
