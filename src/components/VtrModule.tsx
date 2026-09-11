import React, { useState, useEffect } from "react";
import {
  Car,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Cpu,
  Clock,
  Radio,
  FileText,
  RefreshCw,
  Sliders,
  Network,
  ArrowRight,
  Terminal,
  Server,
  Wifi,
  WifiOff,
  Volume2,
  Save,
  Check,
  Zap,
  Laptop,
  Globe,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VtrPassageResult, McpServerConfig, TrajectoryStep, AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";

interface VtrModuleProps {
  onSpeak?: (text: string) => void;
  lang?: AppLanguage;
  theme?: AppTheme;
}

const ReadableValue: React.FC<{ value: any; isDark: boolean }> = ({ value, isDark }) => {
  if (value === null || value === undefined) return <span className="text-slate-500">暂无数据</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    return <div className="space-y-2">{value.map((item, index) => <div key={index} className={`rounded border p-2 ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-slate-50"}`}><ReadableValue value={item} isDark={isDark} /></div>)}</div>;
  }
  return (
    <div className="space-y-2 text-sm">
      {Object.entries(value).map(([key, item]) => (
        <div key={key} className="grid grid-cols-[minmax(7rem,30%)_1fr] gap-3 border-b border-slate-800/50 pb-2 last:border-b-0">
          <div className="font-mono text-xs text-cyan-500 break-words">{key}</div>
          <div className={isDark ? "text-slate-300 break-words" : "text-slate-700 break-words"}><ReadableValue value={item} isDark={isDark} /></div>
        </div>
      ))}
    </div>
  );
};

export const VtrModule: React.FC<VtrModuleProps> = ({
  onSpeak,
  lang = "zh",
  theme = "dark",
}) => {
  const t = getT(lang);
  const isDark = theme === "dark";

  const [plateNumber, setPlateNumber] = useState("粤B88888");
  const [laneId, setLaneId] = useState("G4-京港澳-E02-ETC专道");
  const [scenarioPreset, setScenarioPreset] = useState<"normal" | "tailgating" | "rf_timeout">("normal");
  const [customLogs, setCustomLogs] = useState("");
  const [showCustomLogs, setShowCustomLogs] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VtrPassageResult | null>(null);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [remoteToolResult, setRemoteToolResult] = useState<any>(null);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [toolArgumentsText, setToolArgumentsText] = useState("{}");
  const [callingTool, setCallingTool] = useState(false);
  const [llmSummary, setLlmSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  // MCP Server state
  const [mcpConfig, setMcpConfig] = useState<McpServerConfig | null>(null);
  const [mcpStatus, setMcpStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    message?: string;
    isFallback?: boolean;
    endpoint?: string;
  } | null>(null);
  const [probingMcp, setProbingMcp] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLocalGuide, setShowLocalGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Edit config modal state
  const [editUrl, setEditUrl] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isLocalTarget =
    mcpConfig?.url.includes("127.0.0.1") ||
    mcpConfig?.url.includes("localhost");

  // Load MCP config and test connection on mount
  useEffect(() => {
    fetchMcpConfig();
    probeConnection();
    fetch("/api/mcp/tools")
      .then((res) => res.json())
      .then((data) => {
        const tools = Array.isArray(data.tools) ? data.tools : [];
        setAvailableTools(tools);
        if (tools.length) executeReconstruct("粤B88888", "normal", tools);
      })
      .catch((error) => console.error("Failed to load MCP tools:", error));
  }, []);

  const fetchMcpConfig = async () => {
    try {
      const res = await fetch("/api/mcp/config");
      const data = await res.json();
      if (data.config) {
        setMcpConfig(data.config);
        setEditUrl(data.config.url);
        setEditApiKey(data.config.headers?.["X-API-Key"] || "");
      }
    } catch (e) {
      console.error("Failed to load MCP config:", e);
    }
  };

  const probeConnection = async () => {
    setProbingMcp(true);
    try {
      const res = await fetch("/api/mcp/status");
      const data = await res.json();
      setMcpStatus(data);
    } catch (e: any) {
      setMcpStatus({
        connected: false,
        message: e.message,
        isFallback: true,
      });
    } finally {
      setProbingMcp(false);
    }
  };

  const handleApplyPreset = async (preset: "local" | "remote") => {
    try {
      const res = await fetch("/api/mcp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setMcpConfig(data.config);
        setEditUrl(data.config.url);
        setEditApiKey(data.config.headers?.["X-API-Key"] || "");
        probeConnection();
      }
    } catch (e) {
      console.error("Failed to apply preset:", e);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch("/api/mcp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editUrl,
          headers: { "X-API-Key": editApiKey },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMcpConfig(data.config);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setShowConfigModal(false);
        }, 1200);
        probeConnection();
      }
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const unwrapToolResult = (value: any): any => {
    if (!value || typeof value !== "object") return value;
    if (value.structuredContent?.result !== undefined) return unwrapToolResult(value.structuredContent.result);
    if (Array.isArray(value.content)) {
      const text = value.content.find((item: any) => typeof item?.text === "string")?.text;
      if (text) {
        try { return unwrapToolResult(JSON.parse(text)); } catch { return text; }
      }
    }
    if (typeof value.result === "string") {
      try { return unwrapToolResult(JSON.parse(value.result)); } catch { return value.result; }
    }
    return value;
  };

  const summarizeRemoteResult = async (toolName: string, value: any) => {
    setSummarizing(true);
    try {
      const provider = localStorage.getItem("jarvis_chat_provider") || "gemini-live";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chat-provider": provider },
        body: JSON.stringify({
          provider,
          message: `请把 MCP 工具 ${toolName} 返回的轨迹/车辆诊断结果整理成简洁、可读的中文报告。请按“结论、关键时间线、证据、异常、建议”分段；不要输出 JSON，不要虚构不存在的数据。\n\n返回结果：\n${JSON.stringify(value)}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) setLlmSummary(data.reply);
    } catch (error) {
      console.error("Failed to summarize MCP result:", error);
    } finally {
      setSummarizing(false);
    }
  };

  const callTool = async (tool: any, args?: Record<string, any>) => {
    setCallingTool(true);
    setSelectedToolName(tool.name);
    try {
      const parsedArgs = args || JSON.parse(toolArgumentsText || "{}");
      const res = await fetch("/api/mcp/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: tool.name, arguments: parsedArgs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MCP tool call failed");
      const unwrapped = unwrapToolResult(data.result);
      setRemoteToolResult({ toolName: tool.name, result: unwrapped });
      setResult(null);
      setLlmSummary("");
      summarizeRemoteResult(tool.name, unwrapped);
    } catch (error: any) {
      setRemoteToolResult({ toolName: tool.name, result: { error: error.message } });
    } finally {
      setCallingTool(false);
    }
  };

  const executeReconstruct = async (
    targetPlate = plateNumber,
    preset = scenarioPreset,
    tools = availableTools
  ) => {
    setLoading(true);
    setRemoteToolResult(null);
    try {
      const requestedTool = tools.find((tool) => tool.name === "vtr_reconstruct_trajectory")
        || tools.find((tool) => tool.name === "reconstruct_logs");
      if (!requestedTool) throw new Error("远端 MCP 未提供轨迹重构工具。");

      const toolArguments = requestedTool.name === "reconstruct_logs"
        ? { max_lines: 2000 }
        : {
            plateNumber: targetPlate,
            laneId,
            scenarioPreset: preset,
            rawLogs: showCustomLogs ? customLogs : undefined,
          };
      const res = await fetch("/api/mcp/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: requestedTool.name,
          arguments: toolArguments,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        const candidate = unwrapToolResult(data.result);
        if (Array.isArray(candidate.trajectorySteps) && candidate.evidence) {
          setResult({
            ...candidate,
            trajectorySteps: candidate.trajectorySteps || [],
            evidence: {
              ...candidate.evidence,
              detectedAnomalies: Array.isArray(candidate.evidence.detectedAnomalies)
                ? candidate.evidence.detectedAnomalies
                : [],
            },
          });
        } else {
          console.warn("MCP returned a non-VTR report shape:", candidate);
          setRemoteToolResult({ toolName: requestedTool.name, result: candidate });
          setResult(null);
          setLlmSummary("");
          summarizeRemoteResult(requestedTool.name, candidate);
        }
      }
    } catch (e) {
      console.error("VTR Reconstruction error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (deviceType: TrajectoryStep["deviceType"]) => {
    switch (deviceType) {
      case "coil":
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case "laser":
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case "camera":
        return <Car className="w-4 h-4 text-blue-400" />;
      case "rsu":
        return <Radio className="w-4 h-4 text-purple-400" />;
      case "barrier":
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      default:
        return <Cpu className="w-4 h-4 text-cyan-300" />;
    }
  };

  return (
    <div id="vtr-module" className="space-y-6">
      {/* Top Banner: MCP Server Bridge Status & Deployment Switcher */}
      <div
        className={`rounded-xl p-4 shadow-lg backdrop-blur relative overflow-hidden transition-colors border ${
          isDark
            ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
            : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-lg border shadow-sm ${
                isDark
                  ? "bg-cyan-950 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  : "bg-cyan-50 border-cyan-300 text-cyan-700"
              }`}
            >
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`font-mono font-bold tracking-wider text-base ${
                    isDark ? "text-cyan-300" : "text-cyan-800"
                  }`}
                >
                  {t.vtrTitle}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                    isDark
                      ? "bg-cyan-950 border-cyan-500/40 text-cyan-400"
                      : "bg-cyan-100 border-cyan-300 text-cyan-800 font-semibold"
                  }`}
                >
                  LTC • 利通虾智能体
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                    isLocalTarget
                      ? isDark
                        ? "bg-emerald-950 border-emerald-500/40 text-emerald-400"
                        : "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                      : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-300"
                      : "bg-slate-100 border-slate-300 text-slate-700 font-semibold"
                  }`}
                >
                  {isLocalTarget ? "本地部署 (LOCALHOST:8790)" : "远程集群 (128.23.8.200)"}
                </span>
              </div>
              <p
                className={`text-xs mt-1 max-w-3xl leading-relaxed ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {mcpConfig?.description || t.vtrSubtitle}
              </p>
            </div>
          </div>

          {/* MCP Telemetry & Control Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Quick Switch Buttons */}
            <button
              id="quick-mcp-local-btn"
              onClick={() => handleApplyPreset("local")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                isLocalTarget
                  ? isDark
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                    : "bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold shadow-xs"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
              }`}
              title="切换至本地部署的 MCP 服务 (http://127.0.0.1:8790/sse)"
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === "zh" ? "本地部署" : "Localhost"}</span>
            </button>

            <button
              id="quick-mcp-remote-btn"
              onClick={() => handleApplyPreset("remote")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                !isLocalTarget
                  ? isDark
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-cyan-100 border-cyan-500 text-cyan-800 font-semibold shadow-xs"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
              }`}
              title="切换至远程 MCP 服务 (http://128.23.8.200:8790/sse)"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === "zh" ? "远程集群" : "Remote"}</span>
            </button>

            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                mcpStatus?.connected
                  ? isDark
                    ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                  : isDark
                  ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  : "bg-amber-50 border-amber-300 text-amber-800 font-semibold"
              }`}
            >
              {mcpStatus?.connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>LIVE SSE ({mcpStatus.latencyMs}ms)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === "zh" ? "仿真引擎接管中" : "SIMULATION CORE"}</span>
                </>
              )}
            </div>

            <button
              id="probe-mcp-btn"
              onClick={probeConnection}
              disabled={probingMcp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
              }`}
              title="测试 MCP SSE 链路"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probingMcp ? "animate-spin" : ""}`} />
              <span>{probingMcp ? t.vtrTesting : t.vtrTestConn}</span>
            </button>

            <button
              id="mcp-guide-btn"
              onClick={() => setShowLocalGuide(!showLocalGuide)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                showLocalGuide
                  ? "bg-cyan-600 text-white border-cyan-500 font-semibold"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-400"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-cyan-800"
              }`}
              title="查看本地部署运行指南"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === "zh" ? "部署指南" : "Guide"}</span>
              {showLocalGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              id="mcp-config-btn"
              onClick={() => setShowConfigModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isDark
                  ? "bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-500/40 text-cyan-300"
                  : "bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800 font-semibold"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-500" />
              <span>{lang === "zh" ? "高级配置" : "Config"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Local Deployment Guide */}
        {showLocalGuide && (
          <div
            className={`mt-3 p-4 rounded-xl border text-xs font-mono space-y-3 transition-all ${
              isDark
                ? "bg-slate-950/90 border-cyan-500/40 text-slate-300"
                : "bg-slate-50 border-cyan-300 text-slate-800 shadow-inner"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-cyan-400">
                <Laptop className="w-4 h-4" />
                <span>{t.vtrLocalGuideTitle}</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PORT 8790 • SSE TRANSPORT
              </span>
            </div>

            <p className="leading-relaxed">
              {lang === "zh"
                ? "Jarvis 支持无缝挂载您在本地主机运行的 VTR MCP Server。您可以使用 Python FastMCP 或 Node.js 启动本地诊断服务端，监听 8790 端口："
                : "Jarvis seamlessly links to your local VTR MCP Server running on your host machine. Launch the diagnostic service on port 8790:"}
            </p>

            <div className="space-y-2">
              <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${isDark ? "bg-black/80 border-slate-800" : "bg-white border-slate-300"}`}>
                <code className="text-cyan-300">uvicorn vtr_mcp_server:app --host 127.0.0.1 --port 8790</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard("uvicorn vtr_mcp_server:app --host 127.0.0.1 --port 8790", "cmd1")}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  {copiedCmd === "cmd1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === "cmd1" ? "已复制" : "复制"}</span>
                </button>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${isDark ? "bg-black/80 border-slate-800" : "bg-white border-slate-300"}`}>
                <code className="text-cyan-300">python -m fastmcp run vtr_server.py --port 8790</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard("python -m fastmcp run vtr_server.py --port 8790", "cmd2")}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  {copiedCmd === "cmd2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === "cmd2" ? "已复制" : "复制"}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
              <span>{lang === "zh" ? "当前探测地址: " : "Current probe URL: "} <span className="text-cyan-400 font-bold">http://127.0.0.1:8790/sse</span></span>
              <span>{lang === "zh" ? "提示：未启动本地服务时，系统自动无缝启用高保真切片内核保障测试体验。" : "Notice: Falls back to embedded slice core if port is unopened."}</span>
            </div>
          </div>
        )}

        {/* MCP Endpoint Details Subbar */}
        <div
          className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
            isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>Target SSE: </span>
              <span className="text-cyan-500 font-semibold">{mcpConfig?.url || "http://128.23.8.200:8790/sse"}</span>
            </div>
            <div>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>Mode: </span>
              <span className={isDark ? "text-slate-300 font-semibold" : "text-slate-700 font-semibold"}>
                {isLocalTarget ? "Localhost (本地部署)" : "Remote Enterprise Cluster"}
              </span>
            </div>
            <div>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>Access Effect: </span>
              <span className="text-emerald-500 font-semibold">Allow (0 overrides)</span>
            </div>
          </div>
          <div className={`text-[11px] ${isDark ? "text-cyan-400/80" : "text-cyan-700"}`}>
            {mcpStatus?.message ? `Notice: ${mcpStatus.message}` : "Ready to slice lane logs"}
          </div>
        </div>
      </div>

      {/* Control Panel: Reconstruction Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div
            className={`rounded-xl p-5 shadow-lg backdrop-blur border transition-colors ${
              isDark
                ? "bg-slate-900/90 border-cyan-800/30 text-slate-100"
                : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
            }`}
          >
            <h4
              className={`font-mono text-sm uppercase tracking-wider font-bold flex items-center gap-2 mb-4 ${
                isDark ? "text-cyan-400" : "text-cyan-800"
              }`}
            >
              <Car className="w-4 h-4 text-cyan-500" />
              {t.vtrScenario}
            </h4>

            {/* Quick Scenario Preset Chips */}
            <div className="mb-4">
              <label
                className={`text-xs font-mono mb-2 block ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {lang === "zh" ? "快速测试通行场景预设:" : "Quick Scenario Presets:"}
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  id="preset-normal"
                  type="button"
                  onClick={() => {
                    setScenarioPreset("normal");
                    setPlateNumber("粤B88888");
                    executeReconstruct("粤B88888", "normal");
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs font-mono transition-all ${
                    scenarioPreset === "normal"
                      ? isDark
                        ? "bg-cyan-950/80 border-cyan-400/70 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-cyan-50 border-cyan-500 text-cyan-900 font-semibold shadow-xs"
                      : isDark
                      ? "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.vtrScenarioNormal}</span>
                  </div>
                  <span className="text-[10px] text-cyan-500 font-bold">粤B88888</span>
                </button>

                <button
                  id="preset-tailgating"
                  type="button"
                  onClick={() => {
                    setScenarioPreset("tailgating");
                    setPlateNumber("粤B66882");
                    executeReconstruct("粤B66882", "tailgating");
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs font-mono transition-all ${
                    scenarioPreset === "tailgating"
                      ? isDark
                        ? "bg-amber-950/60 border-amber-400/70 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs"
                      : isDark
                      ? "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.vtrScenarioTailgating}</span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-bold">粤B66882</span>
                </button>

                <button
                  id="preset-rf-timeout"
                  type="button"
                  onClick={() => {
                    setScenarioPreset("rf_timeout");
                    setPlateNumber("粤S12345");
                    executeReconstruct("粤S12345", "rf_timeout");
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs font-mono transition-all ${
                    scenarioPreset === "rf_timeout"
                      ? isDark
                        ? "bg-rose-950/60 border-rose-400/70 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                        : "bg-rose-50 border-rose-500 text-rose-900 font-semibold shadow-xs"
                      : isDark
                      ? "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t.vtrScenarioRfTimeout}</span>
                  </div>
                  <span className="text-[10px] text-rose-500 font-bold">粤S12345</span>
                </button>
              </div>
            </div>

            {/* Manual Form Inputs */}
            <div className="space-y-3">
              <div>
                <label
                  className={`text-xs font-mono mb-1 block ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t.vtrPlateInput} (Plate Number):
                </label>
                <div className="relative">
                  <input
                    id="plate-input"
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="如：粤B88888、京A66666"
                    className={`w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-400 uppercase tracking-widest border transition-colors ${
                      isDark
                        ? "bg-slate-950 border-cyan-800/50 text-cyan-300"
                        : "bg-slate-50 border-slate-300 text-slate-900 font-semibold"
                    }`}
                  />
                  <span
                    className={`absolute right-2.5 top-2 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isDark
                        ? "bg-blue-950 text-blue-300 border-blue-600/40"
                        : "bg-blue-50 text-blue-700 border-blue-300"
                    }`}
                  >
                    ANPR
                  </span>
                </div>
              </div>

              <div>
                <label
                  className={`text-xs font-mono mb-1 block ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t.vtrLaneInput} (Lane ID):
                </label>
                <input
                  id="lane-input"
                  type="text"
                  value={laneId}
                  onChange={(e) => setLaneId(e.target.value)}
                  placeholder="车道ID"
                  className={`w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-400 border transition-colors ${
                    isDark
                      ? "bg-slate-950 border-cyan-800/50 text-slate-300"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowCustomLogs(!showCustomLogs)}
                  className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 mt-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showCustomLogs ? "收起自定义车道日志" : "注入原始车道文本日志..."}</span>
                </button>
                {showCustomLogs && (
                  <textarea
                    id="custom-logs-input"
                    value={customLogs}
                    onChange={(e) => setCustomLogs(e.target.value)}
                    placeholder="粘贴车道软硬件原始文本日志片段 (线圈、激光、抓拍机、天线)..."
                    rows={4}
                    className={`w-full mt-2 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-cyan-400 border transition-colors ${
                      isDark
                        ? "bg-slate-950 border-cyan-800/50 text-slate-300"
                        : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                )}
              </div>

              <button
                id="execute-vtr-btn"
                type="button"
                onClick={() => executeReconstruct()}
                disabled={loading}
                className="w-full mt-3 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
              >
                <Cpu className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? t.vtrReconstructing : t.vtrRunReconstruction}</span>
              </button>
            </div>
          </div>

          {/* Quick MCP Tool Declarations */}
          <div
            className={`rounded-xl p-4 text-xs font-mono border transition-colors ${
              isDark
                ? "bg-slate-900/70 border-slate-800 text-slate-300"
                : "bg-white border-slate-200 text-slate-700 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-bold text-cyan-500">
              <Network className="w-4 h-4" />
              <span>AVAILABLE MCP TOOLS</span>
            </div>
              <div className="space-y-2 text-[11px] max-h-[32rem] overflow-y-auto">
              {availableTools.map((tool) => (
                <div key={tool.name} className={`p-2 rounded border ${isDark ? "bg-slate-950/80 border-slate-800/80" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={isDark ? "text-cyan-300 font-semibold" : "text-cyan-800 font-semibold"}>{tool.name}</span>
                    <button type="button" disabled={callingTool} onClick={() => { setSelectedToolName(tool.name); setToolArgumentsText(JSON.stringify({}, null, 2)); }} className="px-2 py-1 rounded border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-50">参数</button>
                  </div>
                  <div className="mt-1 text-slate-500 leading-relaxed">{tool.description || "未提供工具说明"}</div>
                  {selectedToolName === tool.name && (
                    <div className="mt-2 space-y-2">
                      <textarea value={toolArgumentsText} onChange={(e) => setToolArgumentsText(e.target.value)} rows={4} className={`w-full rounded border p-2 text-[10px] font-mono ${isDark ? "bg-black border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700"}`} placeholder={JSON.stringify(tool.inputSchema?.properties || {}, null, 2)} />
                      <button type="button" disabled={callingTool} onClick={() => callTool(tool)} className="w-full px-2 py-1.5 rounded bg-cyan-700 text-white font-semibold hover:bg-cyan-600 disabled:opacity-50">{callingTool && selectedToolName === tool.name ? "调用中..." : "调用此工具"}</button>
                    </div>
                  )}
                </div>
              ))}
              {!availableTools.length && <div className="text-slate-500">暂无可用 MCP 工具</div>}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Trajectory Chronology & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Summary Metric Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`rounded-xl p-3.5 shadow-sm border transition-colors ${
                    isDark
                      ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                      : "bg-white/95 border-slate-200 text-slate-800 shadow-xs"
                  }`}
                >
                  <div
                    className={`text-[11px] font-mono uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t.vtrConfidence}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-2xl font-black font-mono tracking-tight ${
                        result.confidenceScore >= 90
                          ? "text-emerald-500"
                          : result.confidenceScore >= 60
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {result.confidenceScore}%
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                        result.qualityLevel === "EXCELLENT"
                          ? isDark
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : result.qualityLevel === "QUESTIONABLE"
                          ? isDark
                            ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                          : isDark
                          ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {result.qualityLevel}
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-xl p-3.5 shadow-sm border transition-colors ${
                    isDark
                      ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                      : "bg-white/95 border-slate-200 text-slate-800 shadow-xs"
                  }`}
                >
                  <div
                    className={`text-[11px] font-mono uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t.vtrPlate} / {t.vtrSpeed.split(" ")[0]}
                  </div>
                  <div
                    className={`mt-1 font-mono font-bold text-base truncate ${
                      isDark ? "text-cyan-300" : "text-cyan-700"
                    }`}
                  >
                    {result.plateNumber}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 truncate ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {result.vehicleClass}
                  </div>
                </div>

                <div
                  className={`rounded-xl p-3.5 shadow-sm border transition-colors ${
                    isDark
                      ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                      : "bg-white/95 border-slate-200 text-slate-800 shadow-xs"
                  }`}
                >
                  <div
                    className={`text-[11px] font-mono uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t.vtrSpeed}
                  </div>
                  <div
                    className={`mt-1 font-mono font-bold text-base ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {result.speedKmh} km/h
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t.vtrDuration}: {result.durationMs} ms
                  </div>
                </div>

                <div
                  className={`rounded-xl p-3.5 shadow-sm border transition-colors ${
                    isDark
                      ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                      : "bg-white/95 border-slate-200 text-slate-800 shadow-xs"
                  }`}
                >
                  <div
                    className={`text-[11px] font-mono uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t.vtrSliceId}
                  </div>
                  <div
                    className={`mt-1 font-mono text-xs truncate ${
                      isDark ? "text-slate-300" : "text-slate-700 font-semibold"
                    }`}
                  >
                    {result.passageId}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 truncate ${
                      isDark ? "text-cyan-400" : "text-cyan-700"
                    }`}
                  >
                    {result.reconstructionEngine}
                  </div>
                </div>
              </div>

              {/* Trajectory Timeline Flow */}
              <div
                className={`rounded-xl p-5 shadow-lg backdrop-blur border transition-colors ${
                  isDark
                    ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                    : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4
                    className={`font-mono text-sm uppercase tracking-wider font-bold flex items-center gap-2 ${
                      isDark ? "text-cyan-300" : "text-cyan-800"
                    }`}
                  >
                    <Activity className="w-4 h-4 text-cyan-500" />
                    {t.vtrChronology}
                  </h4>
                  <span
                    className={`text-xs font-mono ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {result.startTime} → {result.endTime}
                  </span>
                </div>

                {/* Stepper visualization */}
                <div
                  className={`relative border-l-2 ml-4 pl-6 space-y-4 ${
                    isDark ? "border-cyan-900/60" : "border-slate-300"
                  }`}
                >
                  {(result.trajectorySteps || []).map((step) => (
                    <div key={step.stepIndex} className="relative group">
                      {/* Step node dot */}
                      <div
                        className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full flex items-center justify-center border shadow-xs ${
                          step.status === "success"
                            ? isDark
                              ? "bg-slate-900 border-emerald-400/80 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                              : "bg-white border-emerald-500 text-emerald-600 shadow-xs"
                            : step.status === "warning"
                            ? isDark
                              ? "bg-slate-900 border-amber-400/80 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                              : "bg-white border-amber-500 text-amber-600 shadow-xs"
                            : isDark
                            ? "bg-slate-900 border-rose-400/80 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                            : "bg-white border-rose-500 text-rose-600 shadow-xs"
                        }`}
                      >
                        {getStepIcon(step.deviceType)}
                      </div>

                      {/* Content Card */}
                      <div
                        className={`p-3 rounded-lg border transition-colors ${
                          step.status === "success"
                            ? isDark
                              ? "bg-slate-950/70 border-slate-800/90 hover:border-cyan-800"
                              : "bg-slate-50/90 border-slate-200 hover:border-cyan-400"
                            : step.status === "warning"
                            ? isDark
                              ? "bg-amber-950/20 border-amber-800/50 hover:border-amber-700"
                              : "bg-amber-50/80 border-amber-200 hover:border-amber-300"
                            : isDark
                            ? "bg-rose-950/20 border-rose-800/50 hover:border-rose-700"
                            : "bg-rose-50/80 border-rose-200 hover:border-rose-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-xs font-bold ${
                                isDark ? "text-cyan-300" : "text-cyan-800"
                              }`}
                            >
                              {step.deviceName}
                            </span>
                            <span
                              className={`text-[11px] font-mono ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              [{step.action}]
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span
                              className={`flex items-center gap-1 ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {step.timestamp}
                            </span>
                            <span
                              className={`font-semibold ${
                                isDark ? "text-cyan-400" : "text-cyan-600"
                              }`}
                            >
                              +{step.timeOffsetMs}ms
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-xs mt-1.5 leading-relaxed font-sans ${
                            isDark ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          {step.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostic debrief & Evidence logs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tactical Report */}
                <div
                  className={`rounded-xl p-4 shadow-md backdrop-blur border transition-colors ${
                    isDark
                      ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                      : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5
                      className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isDark ? "text-cyan-300" : "text-cyan-800"
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                      {t.vtrDiagnosis}
                    </h5>
                    {onSpeak && (
                      <button
                        onClick={() => onSpeak(result.diagnosticSummary)}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? "text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/60"
                            : "text-cyan-700 hover:bg-cyan-50"
                        }`}
                        title="朗读研判结果"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`text-xs leading-relaxed p-3 rounded-lg border ${
                      isDark
                        ? "text-slate-300 bg-slate-950/80 border-slate-800"
                        : "text-slate-700 bg-slate-50 border-slate-200"
                    }`}
                  >
                    {result.diagnosticSummary}
                  </div>

                  {/* Anomaly list */}
                  {result.evidence.detectedAnomalies.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] font-mono text-amber-500 font-bold mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {t.vtrAnomalies}:
                      </div>
                      <div className="space-y-1">
                        {(result.evidence.detectedAnomalies || []).map((anom, idx) => (
                          <div
                            key={idx}
                            className={`text-xs font-mono rounded px-2 py-1 border ${
                              isDark
                                ? "text-amber-200/90 bg-amber-950/40 border-amber-800/40"
                                : "text-amber-800 bg-amber-50 border-amber-300"
                            }`}
                          >
                            • {anom}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sliced Transaction Evidence */}
                <div
                  className={`rounded-xl p-4 shadow-md backdrop-blur border transition-colors ${
                    isDark
                      ? "bg-slate-900/90 border-cyan-800/40 text-slate-100"
                      : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
                  }`}
                >
                  <h5
                    className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2 ${
                      isDark ? "text-cyan-300" : "text-cyan-800"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-500" />
                    {t.vtrEvidence}
                  </h5>
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                      isDark
                        ? "bg-slate-950/80 border-slate-800 text-slate-300"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>ETC流水号:</span>
                      <span className={isDark ? "text-slate-300" : "text-slate-800 font-medium"}>{result.evidence.transactionLogs.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>ETC卡号:</span>
                      <span className={isDark ? "text-slate-300" : "text-slate-800 font-medium"}>{result.evidence.transactionLogs.cardId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>OBU识别号:</span>
                      <span className={isDark ? "text-slate-300" : "text-slate-800 font-medium"}>{result.evidence.transactionLogs.obuId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>扣费金额:</span>
                      <span className="text-emerald-500 font-bold">¥{result.evidence.transactionLogs.feeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>交易状态码:</span>
                      <span className={result.evidence.transactionLogs.tradeStatus.includes("SUCCESS") ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                        {result.evidence.transactionLogs.tradeStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>TAC交易认证码:</span>
                      <span className={isDark ? "text-cyan-400 font-semibold" : "text-cyan-700 font-semibold"}>{result.evidence.transactionLogs.tac}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : remoteToolResult ? (
            <div className={`rounded-xl border p-5 ${isDark ? "bg-slate-900/80 border-cyan-800/40" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                MCP {remoteToolResult.toolName} 返回结果
              </div>
              {llmSummary && <div className={`mt-4 rounded-lg border p-4 text-sm leading-7 whitespace-pre-wrap ${isDark ? "bg-cyan-950/20 border-cyan-800/40 text-slate-200" : "bg-cyan-50 border-cyan-200 text-slate-700"}`}>{llmSummary}</div>}
              {summarizing && <div className="mt-3 text-xs text-cyan-400">正在请文本模型整理结果...</div>}
              {!llmSummary && !summarizing && <ReadableValue value={remoteToolResult.result} isDark={isDark} />}
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-slate-500">查看原始返回 JSON</summary>
                <pre className="mt-2 max-h-[24rem] overflow-auto whitespace-pre-wrap text-xs font-mono text-slate-500">{JSON.stringify(remoteToolResult.result, null, 2)}</pre>
              </details>
            </div>
          ) : (
            <div
              className={`h-96 flex flex-col items-center justify-center text-center p-8 rounded-xl border ${
                isDark
                  ? "bg-slate-900/50 border-slate-800 text-slate-300"
                  : "bg-white border-slate-200 text-slate-700 shadow-sm"
              }`}
            >
              <Cpu className="w-12 h-12 text-cyan-500/40 animate-pulse mb-3" />
              <div className="font-mono text-sm font-semibold">
                {lang === "zh" ? "等待执行车辆轨迹重构" : "Awaiting Trajectory Reconstruction"}
              </div>
              <div
                className={`text-xs mt-1 max-w-sm ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {lang === "zh"
                  ? "选择左侧场景预设或输入车牌号，点击“重构车辆轨迹 & 诊断”，VTR智能体将对车道日志进行切片还原。"
                  : "Select a scenario preset on the left or enter a license plate, then trigger slice reconstruction."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config Edit Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`rounded-xl max-w-lg w-full p-6 shadow-2xl relative border ${
              isDark
                ? "bg-slate-900 border-cyan-500/50 text-slate-100"
                : "bg-white border-slate-300 text-slate-900 shadow-xl"
            }`}
          >
            <h3
              className={`font-mono text-base font-bold flex items-center gap-2 mb-3 ${
                isDark ? "text-cyan-300" : "text-cyan-800"
              }`}
            >
              <Sliders className="w-5 h-5 text-cyan-500" />
              {t.vtrConfigModalTitle}
            </h3>
            <p
              className={`text-xs mb-4 leading-relaxed ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {t.vtrConfigModalDesc}
            </p>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label
                  className={`block mb-1 font-semibold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  {t.vtrEndpointUrl}:
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="http://128.23.8.200:8790/sse 或 http://127.0.0.1:8790/sse"
                  className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-cyan-400 border transition-colors ${
                    isDark
                      ? "bg-slate-950 border-cyan-800/60 text-cyan-300"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block mb-1 font-semibold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Header: X-API-Key:
                </label>
                <input
                  type="text"
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  placeholder="读取自 VTR_MCP_API_KEY，或手动输入"
                  className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-cyan-400 border transition-colors ${
                    isDark
                      ? "bg-slate-950 border-cyan-800/60 text-slate-300"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div
                className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
                  isDark
                    ? "bg-slate-950/90 border-slate-800 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div>
                  <span className={isDark ? "text-slate-500" : "text-slate-400"}>Key: </span>
                  vtr-mcp-server
                </div>
                <div>
                  <span className={isDark ? "text-slate-500" : "text-slate-400"}>Default Effect: </span>
                  allow (0 overrides)
                </div>
                <div>
                  <span className={isDark ? "text-slate-500" : "text-slate-400"}>Fallback Engine: </span>
                  VTR High-Fidelity Embedded Diagnostic Core
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className={`px-4 py-2 rounded-lg font-mono text-xs transition-colors ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {t.vtrCancel}
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{t.vtrSaved}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{t.vtrSaveConfig}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
