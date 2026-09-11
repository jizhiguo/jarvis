export interface SearchSource {
  title: string;
  url: string;
}

export interface TrajectoryStep {
  stepIndex: number;
  timestamp: string;
  timeOffsetMs: number;
  deviceType: "coil" | "laser" | "camera" | "rsu" | "barrier" | "system";
  deviceName: string;
  action: string;
  status: "success" | "warning" | "error";
  details: string;
  dataPayload?: Record<string, any>;
}

export interface VtrPassageResult {
  passageId: string;
  plateNumber: string;
  laneId: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  speedKmh: number;
  confidenceScore: number;
  qualityLevel: "EXCELLENT" | "GOOD" | "QUESTIONABLE" | "FAILED";
  vehicleClass: string;
  trajectorySteps: TrajectoryStep[];
  evidence: {
    deviceLogs: Array<{ time: string; device: string; level: string; message: string }>;
    transactionLogs: {
      transactionId: string;
      cardId: string;
      obuId: string;
      feeAmount: number;
      tradeStatus: string;
      psamId: string;
      tac: string;
    };
    sensorCorrelation: {
      coilLaserMatch: boolean;
      anprObuMatch: boolean;
      barrierTimingValid: boolean;
      speedConsistency: number;
    };
    detectedAnomalies: string[];
  };
  diagnosticSummary: string;
  reconstructionEngine: string;
}

export interface McpServerConfig {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  transport: "sse" | "stdio" | "http";
  url: string;
  headers: Record<string, string>;
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd: string;
  tools?: any[] | null;
  oauth_status?: any | null;
  access_summary?: {
    default_effect: string;
    overrides_count: number;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "jarvis";
  content: string;
  timestamp: string;
  sources?: SearchSource[];
  isStreaming?: boolean;
  actionType?: "search" | "create" | "reimagine" | "talk" | "vtr";
  mediaUrl?: string;
  vtrResult?: VtrPassageResult;
}

export interface IllustrationItem {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  style: string;
  model: string;
  timestamp: string;
}

export interface ReimagineItem {
  id: string;
  originalImage: string;
  reimaginedImage: string;
  prompt: string;
  style: string;
  model: string;
  timestamp: string;
}

export type ActiveTab = "console" | "search" | "create" | "reimagine" | "vtr";

export type JarvisVoice = "Fenrir" | "Zephyr" | "Puck" | "Charon" | "Kore";

export type AppLanguage = "zh" | "en";

export type AppTheme = "dark" | "light";

