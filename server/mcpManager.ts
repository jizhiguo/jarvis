import "dotenv/config";
import { Agent, fetch as undiciFetch } from "undici";

const directDispatcher = new Agent({
  connect: { timeout: 5000 },
});

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
      speedConsistency: number; // 0-100%
    };
    detectedAnomalies: string[];
  };
  diagnosticSummary: string;
  reconstructionEngine: string;
}

export const MCP_PRESETS = {
  local: {
    key: "vtr-mcp-server",
    name: "vtr-mcp-server (Localhost)",
    description: "VTR智能体（本地部署模式）：连接本地 127.0.0.1:8790 运行的 FastMCP/SSE 诊断服务。",
    url: "http://127.0.0.1:8790/sse",
    transport: "sse" as const,
    headers: { "X-API-Key": "${VTR_MCP_API_KEY}" },
  },
  remote: {
    key: "vtr-mcp-server",
    name: "vtr-mcp-server (Remote)",
    description: "VTR智能体（远程集群模式）：基于LTC（利通虾）构建的车道日志诊断与轨迹切片还原服务。",
    url: "http://128.23.8.200:8790/sse",
    transport: "sse" as const,
    headers: { "X-API-Key": "${VTR_MCP_API_KEY}" },
  },
};

// Default initial config based on user input & environment variables
export let currentMcpConfig: McpServerConfig = {
  key: "vtr-mcp-server",
  name: "vtr-mcp-server",
  description:
    "VTR智能体（车辆轨迹重构）基于LTC（利通虾）构建。VTR是一个日志诊断工具，主要功能是分析并诊断车道日志，以“一次车辆通行过程”为单位进行切片，还原出过车轨迹，并收集单次通行相关的设备日志、交易日志等日志证据，给出置信度。使用界面包括命令行、Web UI和利通虾LTClaw。",
  enabled: true,
  transport: "sse",
  url: process.env.VTR_MCP_URL || "http://128.23.8.200:8790/sse",
  headers: {
    "X-API-Key": process.env.VTR_MCP_API_KEY || "",
  },
  command: "",
  args: [],
  env: {},
  cwd: "",
  tools: null,
  oauth_status: null,
  access_summary: {
    default_effect: "allow",
    overrides_count: 0,
  },
};

export function updateMcpConfig(newConfig: Partial<McpServerConfig> & { preset?: "local" | "remote" }): McpServerConfig {
  if (newConfig.preset && MCP_PRESETS[newConfig.preset]) {
    const p = MCP_PRESETS[newConfig.preset];
    currentMcpConfig = {
      ...currentMcpConfig,
      ...p,
      headers: {
        ...currentMcpConfig.headers,
        ...p.headers,
      },
    };
  }
  
  const incomingHeaders = { ...(newConfig.headers || {}) };
  const incomingApiKey = incomingHeaders["X-API-Key"];
  if (!incomingApiKey || incomingApiKey.includes("*")) {
    const configuredApiKey = process.env.VTR_MCP_API_KEY;
    if (configuredApiKey) incomingHeaders["X-API-Key"] = configuredApiKey;
  }

  currentMcpConfig = {
    ...currentMcpConfig,
    ...newConfig,
    headers: {
      ...currentMcpConfig.headers,
      ...incomingHeaders,
    },
  };
  return currentMcpConfig;
}

export function getMcpConfig(): McpServerConfig {
  return currentMcpConfig;
}

type McpJsonRpcResponse = {
  id?: number;
  result?: any;
  error?: { code: number; message: string; data?: any };
};

function resolveMcpUrl(baseUrl: string, location: string): string {
  return new URL(location, baseUrl).toString();
}

function resolveMcpHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, envName: string) => process.env[envName] || ""),
    ])
  );
}

async function readSseEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  buffer: { value: string }
): Promise<{ event: string; data: string } | null> {
  while (true) {
    const boundaryMatch = /\r?\n\r?\n/.exec(buffer.value);
    if (boundaryMatch && boundaryMatch.index !== undefined) {
      const raw = buffer.value.slice(0, boundaryMatch.index).replace(/\r/g, "");
      buffer.value = buffer.value.slice(boundaryMatch.index + boundaryMatch[0].length);
      const event = raw.match(/^event:\s*(.*)$/m)?.[1] || "message";
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      return { event, data };
    }

    const chunk = await reader.read();
    if (chunk.done) return null;
    buffer.value += decoder.decode(chunk.value, { stream: true });
  }
}

async function callMcpJsonRpc<T>(method: string, params?: Record<string, any>): Promise<T> {
  const config = currentMcpConfig;
  const headers = resolveMcpHeaders(config.headers);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const sseResponse = await undiciFetch(config.url, {
      method: "GET",
      headers: { Accept: "text/event-stream", ...headers },
      dispatcher: directDispatcher,
      signal: controller.signal,
    } as any);
    if (!sseResponse.ok || !sseResponse.body) {
      throw new Error(`MCP SSE endpoint responded with HTTP ${sseResponse.status}`);
    }

    reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    const buffer = { value: "" };
    let endpoint: string | undefined;
    while (!endpoint) {
      const event = await readSseEvent(reader, decoder, buffer);
      if (!event) throw new Error("MCP SSE stream closed before providing a message endpoint");
      if (event.event === "endpoint" || event.data.startsWith("/")) endpoint = event.data;
    }

    const messageUrl = resolveMcpUrl(config.url, endpoint);
    let requestId = 0;
    const sendRequest = async (requestMethod: string, requestParams?: Record<string, any>) => {
      const id = ++requestId;
      const response = await undiciFetch(messageUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
        body: JSON.stringify({ jsonrpc: "2.0", id, method: requestMethod, params: requestParams || {} }),
        dispatcher: directDispatcher,
        signal: controller.signal,
      } as any);
      if (!response.ok) throw new Error(`MCP message endpoint responded with HTTP ${response.status}`);

      while (true) {
        const event = await readSseEvent(reader!, decoder, buffer);
        if (!event) throw new Error(`MCP SSE stream closed while waiting for ${requestMethod}`);
        if (!event.data) continue;
        const message = JSON.parse(event.data) as McpJsonRpcResponse;
        if (message.id !== id) continue;
        if (message.error) throw new Error(`MCP ${requestMethod} failed: ${message.error.message}`);
        return message.result as T;
      }
    };

    await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "jarvis", version: "1.0.0" },
    });
    await undiciFetch(messageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }),
      dispatcher: directDispatcher,
      signal: controller.signal,
    } as any);
    return await sendRequest(method, params);
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
    await reader?.cancel().catch(() => undefined);
  }
}

export async function listMcpTools(): Promise<any[]> {
  const result = await callMcpJsonRpc<{ tools?: any[] }>("tools/list");
  return result.tools || [];
}

export async function callMcpTool(toolName: string, toolArguments: Record<string, any> = {}): Promise<any> {
  return callMcpJsonRpc("tools/call", { name: toolName, arguments: toolArguments });
}

// Test connection to the remote MCP SSE server with timeout
export async function testMcpConnection(configOverride?: {
  url?: string;
  headers?: Record<string, string>;
}): Promise<{
  connected: boolean;
  statusCode?: number;
  latencyMs: number;
  message: string;
  isFallback: boolean;
  endpoint: string;
}> {
  const startTime = Date.now();
  const url = configOverride?.url || currentMcpConfig.url;
  const headers = {
    Accept: "text/event-stream, application/json, text/plain",
    ...resolveMcpHeaders(configOverride?.headers || currentMcpConfig.headers),
  };
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await undiciFetch(url, {
      method: "GET",
      headers,
      // MCP is commonly deployed on a private LAN and must not use the global proxy.
      dispatcher: directDispatcher,
      signal: controller.signal,
    } as any);
    await response.body?.cancel();

    const latencyMs = Date.now() - startTime;
    return {
      connected: response.ok,
      statusCode: response.status,
      latencyMs,
      message: response.ok
        ? `Successfully reached MCP SSE endpoint at ${url}`
        : `MCP server responded with HTTP status ${response.status}`,
      isFallback: !response.ok,
      endpoint: url,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = err.name === "AbortError" || err.code === "ETIMEDOUT";
    const isLocal = url.includes("127.0.0.1") || url.includes("localhost");
    const timeoutMsg = isLocal
      ? `本地 MCP 服务探测未响应 (${url})。请确保本地 Python/Node 诊断服务已启动在相应端口。已无缝接入内置 VTR 仿真切片内核。`
      : `连接到远程 MCP 服务 (${url}) 超时。已无缝接入内置 VTR 仿真切片内核。`;
    return {
      connected: false,
      latencyMs,
      message: isTimeout ? timeoutMsg : `MCP 探测网络状态: ${err.message}。已启用内置 VTR 切片引擎。`,
      isFallback: true,
      endpoint: url,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Generate realistic, deterministic VTR trajectory reconstruction and log slice
export function executeVtrReconstruction(args: {
  plateNumber: string;
  laneId?: string;
  scenarioPreset?: string;
  rawLogs?: string;
}): VtrPassageResult {
  const plate = (args.plateNumber || "粤B88888").trim().toUpperCase();
  const lane = args.laneId || "G4-京港澳-E02-ETC专道";
  const scenario = args.scenarioPreset || "normal";
  const now = new Date();
  const baseTime = new Date(now.getTime() - 45000);

  const formatIso = (dt: Date) => dt.toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(dt.getMilliseconds()).padStart(3, "0");

  let confidenceScore = 98.6;
  let qualityLevel: "EXCELLENT" | "GOOD" | "QUESTIONABLE" | "FAILED" = "EXCELLENT";
  let speedKmh = 38.5;
  const detectedAnomalies: string[] = [];

  let steps: TrajectoryStep[] = [];

  if (scenario === "tailgating") {
    confidenceScore = 67.2;
    qualityLevel = "QUESTIONABLE";
    speedKmh = 42.1;
    detectedAnomalies.push("后车跟车间距小于0.8米，光栅切片出现断续粘连");
    detectedAnomalies.push("抓拍机ANPR双目标检测触发，首尾牌照置信度不一");

    steps = [
      {
        stepIndex: 1,
        timestamp: formatIso(new Date(baseTime.getTime() + 0)),
        timeOffsetMs: 0,
        deviceType: "coil",
        deviceName: "01号前置测速线圈",
        action: "检测到金属物体压入",
        status: "success",
        details: "车辆前轮压入线圈，电感变化率 ΔL/L = 8.4%，初速度约 42km/h",
      },
      {
        stepIndex: 2,
        timestamp: formatIso(new Date(baseTime.getTime() + 180)),
        timeOffsetMs: 180,
        deviceType: "laser",
        deviceName: "双雷达高精激光光栅",
        action: "车辆轮廓扫描与车型分离",
        status: "warning",
        details: "检测到车身尾部存在阴影粘连（跟车距离0.72m），触发二次切片判定",
      },
      {
        stepIndex: 3,
        timestamp: formatIso(new Date(baseTime.getTime() + 290)),
        timeOffsetMs: 290,
        deviceType: "camera",
        deviceName: "主车道4K全景抓拍一体机",
        action: "车牌OCR定位与特征识别",
        status: "warning",
        details: `主车牌锁定: [${plate}]，置信度94.1%。同时在图像上方视野检测到第二副车牌候选 [粤S5**88]`,
      },
      {
        stepIndex: 4,
        timestamp: formatIso(new Date(baseTime.getTime() + 450)),
        timeOffsetMs: 450,
        deviceType: "rsu",
        deviceName: "ETC 5.8GHz 相控阵天线 RSU",
        action: "DSRC 双向微波握手与交易扣费",
        status: "success",
        details: `读取OBU车载单元 [44010200${Math.floor(Math.random() * 89999 + 10000)}]，车牌匹配成功，交易扣费 ¥18.05`,
      },
      {
        stepIndex: 5,
        timestamp: formatIso(new Date(baseTime.getTime() + 620)),
        timeOffsetMs: 620,
        deviceType: "barrier",
        deviceName: "高速直流无刷自动栏杆机",
        action: "起杆放行指令响应",
        status: "success",
        details: "接收到PLC放行开闸信号，起杆角度 89.2°，起杆用时 0.28s",
      },
      {
        stepIndex: 6,
        timestamp: formatIso(new Date(baseTime.getTime() + 1150)),
        timeOffsetMs: 1150,
        deviceType: "coil",
        deviceName: "02号落杆与防砸线圈",
        action: "检测到车辆尾部离开",
        status: "warning",
        details: "检测到金属物体未完全离开线圈，防砸雷达介入持续保持开闸，防止砸伤后跟车辆",
      },
      {
        stepIndex: 7,
        timestamp: formatIso(new Date(baseTime.getTime() + 1420)),
        timeOffsetMs: 1420,
        deviceType: "system",
        deviceName: "VTR 切片聚合引擎 (LTC)",
        action: "单次通行证据归档与置信度评估",
        status: "warning",
        details: "本次通行判定完成，由于存在跟车贴近风险，置信度评定为 67.2%（建议人工核验流水）",
      },
    ];
  } else if (scenario === "rf_timeout") {
    confidenceScore = 48.3;
    qualityLevel = "QUESTIONABLE";
    speedKmh = 19.8;
    detectedAnomalies.push("5.8G DSRC通讯握手超时重发3次");
    detectedAnomalies.push("OBU状态校验失败：检测到防拆标签触动，转人工/混合处理");

    steps = [
      {
        stepIndex: 1,
        timestamp: formatIso(new Date(baseTime.getTime() + 0)),
        timeOffsetMs: 0,
        deviceType: "coil",
        deviceName: "01号前置测速线圈",
        action: "检测到车辆驶入",
        status: "success",
        details: "车辆慢速驶入车道线圈，初测速度 19.8km/h",
      },
      {
        stepIndex: 2,
        timestamp: formatIso(new Date(baseTime.getTime() + 240)),
        timeOffsetMs: 240,
        deviceType: "camera",
        deviceName: "主车道抓拍一体机",
        action: "车牌识别与车型比对",
        status: "success",
        details: `识别车牌号 [${plate}]，车身颜色：珍珠白，车型：一型客车，OCR置信度99.1%`,
      },
      {
        stepIndex: 3,
        timestamp: formatIso(new Date(baseTime.getTime() + 350)),
        timeOffsetMs: 350,
        deviceType: "rsu",
        deviceName: "ETC 相控阵天线 RSU",
        action: "DSRC 射频通讯建立",
        status: "error",
        details: "发送BST唤醒信号无应答，重试第1次...重试第2次...超时(ErrCode: 0x8201)",
      },
      {
        stepIndex: 4,
        timestamp: formatIso(new Date(baseTime.getTime() + 980)),
        timeOffsetMs: 980,
        deviceType: "rsu",
        deviceName: "ETC 相控阵天线 RSU",
        action: "PSAM卡重构读取",
        status: "warning",
        details: "第3次握手成功但返回防拆片弹出状态(Tamper Triggered)，拒绝自动扣款",
      },
      {
        stepIndex: 5,
        timestamp: formatIso(new Date(baseTime.getTime() + 1150)),
        timeOffsetMs: 1150,
        deviceType: "barrier",
        deviceName: "自动栏杆机",
        action: "栏杆保持闭合状态",
        status: "warning",
        details: "未收到通行许可指令，维持红灯及栏杆拦截状态，触发费显屏报警提示",
      },
      {
        stepIndex: 6,
        timestamp: formatIso(new Date(baseTime.getTime() + 1300)),
        timeOffsetMs: 1300,
        deviceType: "system",
        deviceName: "VTR 切片聚合引擎 (LTC)",
        action: "异常通行证据切片封存",
        status: "error",
        details: "本次通行扣费异常中断，置信度判定 48.3%，切片证据已自动上报利通虾LTClaw看板",
      },
    ];
  } else {
    // Normal passage
    confidenceScore = 99.4;
    qualityLevel = "EXCELLENT";
    speedKmh = 35.2;

    steps = [
      {
        stepIndex: 1,
        timestamp: formatIso(new Date(baseTime.getTime() + 0)),
        timeOffsetMs: 0,
        deviceType: "coil",
        deviceName: "01号前置测速线圈",
        action: "金属地感触发压入",
        status: "success",
        details: "车头触发线圈，感应信号峰值 8.8%，车速判定 35.2 km/h，车距正常",
      },
      {
        stepIndex: 2,
        timestamp: formatIso(new Date(baseTime.getTime() + 120)),
        timeOffsetMs: 120,
        deviceType: "laser",
        deviceName: "双红外/激光高度轮廓仪",
        action: "车辆物理轮廓扫描",
        status: "success",
        details: "轴距 2.82m，车长 4.75m，车高 1.51m，判定为 1型小型客车",
      },
      {
        stepIndex: 3,
        timestamp: formatIso(new Date(baseTime.getTime() + 210)),
        timeOffsetMs: 210,
        deviceType: "camera",
        deviceName: "高精4K车道抓拍识别机",
        action: "高清抓拍与双层OCR识别",
        status: "success",
        details: `抓拍成功，主车牌: [${plate}] 蓝牌，结构置信度 99.8%，车身标徽匹配一致`,
      },
      {
        stepIndex: 4,
        timestamp: formatIso(new Date(baseTime.getTime() + 320)),
        timeOffsetMs: 320,
        deviceType: "rsu",
        deviceName: "ETC 5.8G DSRC相控阵天线",
        action: "高频微波交易与PSAM加密扣费",
        status: "success",
        details: `OBU握手成功(MAC: 4402A8B9)，扣费金额 ¥15.20，PSAM交易TAC码校验通过`,
      },
      {
        stepIndex: 5,
        timestamp: formatIso(new Date(baseTime.getTime() + 450)),
        timeOffsetMs: 450,
        deviceType: "barrier",
        deviceName: "高频伺服快速道闸",
        action: "抬杆放行命令响应",
        status: "success",
        details: "PLC接收到放行触发，0.24秒内完成起杆，绿灯同步点亮",
      },
      {
        stepIndex: 6,
        timestamp: formatIso(new Date(baseTime.getTime() + 890)),
        timeOffsetMs: 890,
        deviceType: "coil",
        deviceName: "02号安全落杆线圈",
        action: "尾部离开触发落杆",
        status: "success",
        details: "车尾离开02号线圈，信号平稳复位，栏杆安全平顺回落",
      },
      {
        stepIndex: 7,
        timestamp: formatIso(new Date(baseTime.getTime() + 980)),
        timeOffsetMs: 980,
        deviceType: "system",
        deviceName: "VTR 轨迹切片聚合器",
        action: "全量证据链封包归档",
        status: "success",
        details: "线圈、激光、相机、天线、道闸全链路毫秒时序吻合，置信度评定 99.4%",
      },
    ];
  }

  const passageId = `VTR-PASS-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 899 + 100)}`;
  const startTimeStr = steps[0].timestamp;
  const endTimeStr = steps[steps.length - 1].timestamp;
  const durationMs = steps[steps.length - 1].timeOffsetMs;

  return {
    passageId,
    plateNumber: plate,
    laneId: lane,
    startTime: startTimeStr,
    endTime: endTimeStr,
    durationMs,
    speedKmh,
    confidenceScore,
    qualityLevel,
    vehicleClass: "1型客车 (小型轿车)",
    trajectorySteps: steps,
    evidence: {
      deviceLogs: [
        { time: startTimeStr, device: "COIL_01", level: "INFO", message: `Loop [01] state change: 0 -> 1, delta_f=142Hz, speed=${speedKmh}km/h` },
        { time: steps[1].timestamp, device: "LASER_CURTAIN", level: "INFO", message: "Scan active. Vehicle bounding box: L=4.75m, H=1.51m, axles=2" },
        { time: steps[2].timestamp, device: "ANPR_CAM", level: "INFO", message: `Plate capture trigger: recognized=[${plate}], confidence=0.998, color=BLUE` },
        { time: steps[3].timestamp, device: "RSU_58G", level: steps[3].status === "error" ? "ERROR" : "INFO", message: `DSRC session status: ${steps[3].details}` },
        { time: steps[4].timestamp, device: "BARRIER_CTL", level: "INFO", message: `Barrier command: ANGLE=90, T_OPEN=${steps[4].timeOffsetMs}ms` },
        { time: endTimeStr, device: "VTR_ENGINE", level: "INFO", message: `Passage sliced. Evidence package compiled, confidence=${confidenceScore}%` },
      ],
      transactionLogs: {
        transactionId: `ETC-${Date.now().toString().slice(-10)}`,
        cardId: `44010299${Math.floor(Math.random() * 899999 + 100000)}`,
        obuId: `44010200${Math.floor(Math.random() * 899999 + 100000)}`,
        feeAmount: scenario === "rf_timeout" ? 0.0 : 15.2,
        tradeStatus: scenario === "rf_timeout" ? "TIMEOUT_ABORT" : "SUCCESS_0x9000",
        psamId: "440001928371",
        tac: scenario === "rf_timeout" ? "N/A" : "A8F9321B",
      },
      sensorCorrelation: {
        coilLaserMatch: scenario !== "tailgating",
        anprObuMatch: scenario !== "rf_timeout",
        barrierTimingValid: true,
        speedConsistency: scenario === "tailgating" ? 74 : 98,
      },
      detectedAnomalies,
    },
    diagnosticSummary:
      scenario === "tailgating"
        ? `【VTR 异常诊断】车辆 [${plate}] 在 ${lane} 通行过程中存在跟车过紧现象（车距仅 0.72m）。激光光栅与车道相机会话呈现双目标粘连特征，置信度降至 67.2%。系统已自动保留首尾车辆切片日志证据，供人工二次复核。`
        : scenario === "rf_timeout"
        ? `【VTR 故障诊断】车辆 [${plate}] 在 ${lane} 通行过程中 5.8G DSRC 天线通信异常中断（错误码 0x8201，OBU防拆触动标记），道闸拒绝开闸放行。本次通行置信度 48.3%，建议检查天线功率覆盖及现场人工补录。`
        : `【VTR 轨迹诊断】车辆 [${plate}] 在 ${lane} 通行过程还原完整。地感线圈、双红外光栅、4K抓拍相机、ETC相控阵天线及直流道闸毫秒级联动吻合，过车平均时速 ${speedKmh} km/h，单次通行时长 ${durationMs} ms，整体置信度评估高达 ${confidenceScore}%，符合免审直放标准。`,
    reconstructionEngine: "VTR-LTC Core v2.4 (利通虾智能体驱动)",
  };
}

// Lane Diagnosis generator
export function executeVtrLaneDiagnostics(laneId: string, timeRange?: string) {
  const lane = laneId || "G4-京港澳-E02-ETC专道";
  return {
    laneId: lane,
    diagnosticTime: new Date().toLocaleString("zh-CN"),
    timeRange: timeRange || "最近 2 小时",
    totalPassagesAnalyzed: 428,
    normalPassages: 419,
    anomalyPassages: 9,
    healthRate: 97.9,
    deviceHealth: [
      { device: "01号前置地感线圈", status: "NORMAL", latency: "2ms", packetLoss: "0.0%", signalQuality: "99.8%" },
      { device: "双红外激光光栅", status: "NORMAL", latency: "4ms", packetLoss: "0.0%", signalQuality: "98.5%" },
      { device: "4K全景抓拍一体机", status: "NORMAL", latency: "18ms", packetLoss: "0.1%", signalQuality: "99.2%" },
      { device: "5.8GHz 相控阵ETC天线", status: "WARNING", latency: "38ms", packetLoss: "1.2%", signalQuality: "94.1%", note: "偶发微波反射盲区，建议校准仰角" },
      { device: "无刷高速道闸控制器", status: "NORMAL", latency: "12ms", packetLoss: "0.0%", signalQuality: "100.0%" },
    ],
    recentAnomalies: [
      { time: "10分钟前", type: "跟车粘连", plate: "粤B77889", confidence: "68.4%", result: "防砸拦截成功" },
      { time: "42分钟前", type: "天线握手超时", plate: "粤S12345", confidence: "49.1%", result: "转人工处理" },
    ],
    recommendedActions: [
      "微调车道ETC相控阵天线方位角约 +2.5°，减少邻道微波旁瓣干扰",
      "光栅发射端防尘镜片定期清洁巡检",
    ],
  };
}
