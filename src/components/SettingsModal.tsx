import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Key,
  Server,
  Mic,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Terminal,
  Save,
  Laptop,
  Globe,
  Radio,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Cpu,
  Shield,
  Layers,
} from "lucide-react";
import { AppLanguage, AppTheme, RealtimeProviderConfig, McpServerConfig, ProviderModality } from "../types";
import { getT } from "../i18n";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiApiKey: string;
  onSaveGeminiApiKey: (key: string) => void;
  mcpUrl: string;
  mcpApiKey: string;
  onSaveMcpConfig: (url: string, apiKey: string) => Promise<boolean>;
  realtimeProviderId: string;
  onSaveRealtimeProvider: (provider: RealtimeProviderConfig) => Promise<boolean>;
  chatProviderId: string;
  onSaveChatProviderId: (providerId: string) => void;
  wakeWordEnabled: boolean;
  onToggleWakeWord: (enabled: boolean) => void;
  onTestWakeWord: (keyword: "利通虾" | "Jarvis") => void;
  lang?: AppLanguage;
  theme?: AppTheme;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  geminiApiKey,
  onSaveGeminiApiKey,
  mcpUrl,
  mcpApiKey,
  onSaveMcpConfig,
  realtimeProviderId,
  onSaveRealtimeProvider,
  chatProviderId,
  onSaveChatProviderId,
  wakeWordEnabled,
  onToggleWakeWord,
  onTestWakeWord,
  lang = "zh",
  theme = "dark",
}) => {
  const [activeTab, setActiveTab] = useState<"realtime" | "mcp" | "api" | "wakeword" | "deploy">("realtime");
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Providers state
  const [realtimeProviders, setRealtimeProviders] = useState<RealtimeProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(realtimeProviderId || "gemini-live");
  const [localProviderDraft, setLocalProviderDraft] = useState<RealtimeProviderConfig | null>(null);
  const [activeChatProviderId, setActiveChatProviderId] = useState<string>(chatProviderId || "gemini-live");

  // Collapsible sections for provider modalities
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    realtime: false,
    text: false,
    image: true,
    video: true,
    headers: true,
  });

  // Modality test statuses: { realtime?: ..., text?: ..., image?: ... }
  const [testingModality, setTestingModality] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});

  // Multi-MCP servers state
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [serverTestResults, setServerTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number; toolCount?: number }>>({});
  const [showAddMcpModal, setShowAddMcpModal] = useState(false);
  const [newMcpServer, setNewMcpServer] = useState<Partial<McpServerConfig>>({
    name: "私有扩展 MCP 服务",
    transport: "http",
    url: "http://127.0.0.1:8790/rpc",
    apiKeyEnv: "VTR_MCP_API_KEY",
    enabled: true,
    timeoutMs: 5000,
  });

  // Global save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const t = getT(lang);
  const isDark = theme === "dark";

  // Reusable styled classes
  const inputClass = `mt-1 w-full px-3 py-2 rounded-lg border text-xs font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
    isDark
      ? "bg-slate-950/80 border-cyan-800/40 text-slate-100 placeholder:text-slate-500"
      : "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
  }`;
  const selectClass = `mt-1 w-full px-3 py-2 rounded-lg text-xs font-mono border transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
    isDark ? "bg-slate-950/80 border-cyan-800/40 text-slate-100" : "bg-white border-slate-300 text-slate-800"
  }`;
  const actionButtonClass = `px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
    isDark
      ? "border-cyan-700/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50"
      : "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
  }`;

  // Initial loads
  useEffect(() => {
    setLocalGeminiKey(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    fetchProviders();
    fetchMcpServers();
  }, [isOpen]);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/realtime/providers");
      if (res.ok) {
        const data = await res.json();
        const list: RealtimeProviderConfig[] = data.providers || [];
        setRealtimeProviders(list);

        const current = list.find((p) => p.id === (selectedProviderId || realtimeProviderId)) || list[0];
        if (current) {
          setSelectedProviderId(current.id);
          setLocalProviderDraft(JSON.parse(JSON.stringify(current)));
        }
      }
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  };

  const fetchMcpServers = async () => {
    try {
      const res = await fetch("/api/mcp/servers");
      if (res.ok) {
        const data = await res.json();
        setMcpServers(data.servers || []);
      }
    } catch (err) {
      console.error("Failed to load MCP servers:", err);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleProviderSelect = (id: string) => {
    setSelectedProviderId(id);
    const found = realtimeProviders.find((p) => p.id === id);
    if (found) {
      setLocalProviderDraft(JSON.parse(JSON.stringify(found)));
      setTestResults({});
    }
  };

  // Test provider modality (realtime, text, image)
  const handleTestProviderModality = async (modality: ProviderModality) => {
    if (!localProviderDraft) return;
    const testKey = `${localProviderDraft.id}-${modality}`;
    setTestingModality(testKey);

    try {
      const res = await fetch(`/api/realtime/providers/${localProviderDraft.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality,
          apiKeyOverride:
            modality === "realtime"
              ? localProviderDraft.apiKey !== "********"
                ? localProviderDraft.apiKey
                : undefined
              : localProviderDraft.textApiKey !== "********"
              ? localProviderDraft.textApiKey
              : undefined,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [modality]: {
          success: data.success,
          message: data.message || (data.success ? "连接正常" : "测试失败"),
          latencyMs: data.latencyMs,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [modality]: {
          success: false,
          message: err.message || "请求超时或网络异常",
        },
      }));
    } finally {
      setTestingModality(null);
    }
  };

  // Save current provider changes
  const handleSaveProvider = async () => {
    if (!localProviderDraft) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/realtime/providers/${localProviderDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localProviderDraft),
      });
      if (res.ok) {
        const data = await res.json();
        await onSaveRealtimeProvider(data.provider);
        onSaveChatProviderId(activeChatProviderId);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3000);
        fetchProviders();
      }
    } catch (err) {
      console.error("Save provider error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Test an MCP server
  const handleTestMcpServer = async (server: McpServerConfig) => {
    setTestingServerId(server.id || server.key);
    try {
      const res = await fetch("/api/mcp/test-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(server),
      });
      const data = await res.json();
      setServerTestResults((prev) => ({
        ...prev,
        [server.id || server.key]: {
          success: data.connected,
          message: data.message,
          latencyMs: data.latencyMs,
          toolCount: data.toolCount,
        },
      }));
    } catch (err: any) {
      setServerTestResults((prev) => ({
        ...prev,
        [server.id || server.key]: {
          success: false,
          message: `连接失败: ${err.message}`,
        },
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  // Toggle MCP Server enabled
  const handleToggleMcpServer = async (server: McpServerConfig) => {
    try {
      const res = await fetch(`/api/mcp/servers/${server.id || server.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !server.enabled }),
      });
      if (res.ok) {
        fetchMcpServers();
      }
    } catch (err) {
      console.error("Toggle MCP server error:", err);
    }
  };

  // Add new MCP server
  const handleCreateMcpServer = async () => {
    if (!newMcpServer.name || !newMcpServer.url) return;
    try {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMcpServer),
      });
      if (res.ok) {
        setShowAddMcpModal(false);
        fetchMcpServers();
      }
    } catch (err) {
      console.error("Create MCP server error:", err);
    }
  };

  // Delete an MCP server
  const handleDeleteMcpServer = async (id: string) => {
    try {
      const res = await fetch(`/api/mcp/servers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMcpServers();
      }
    } catch (err) {
      console.error("Delete MCP server error:", err);
    }
  };

  // Global Save
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (localGeminiKey !== geminiApiKey) {
        onSaveGeminiApiKey(localGeminiKey);
      }
      if (localProviderDraft) {
        await handleSaveProvider();
      }
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? "bg-slate-900 border-cyan-800/50 text-slate-100 shadow-cyan-950/40" : "bg-white border-slate-200 text-slate-900 shadow-slate-300/50"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? "border-cyan-900/40 bg-slate-950/60" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">
                {lang === "zh" ? "核心服务矩阵与模型网关配置" : "Core Services & Model Gateways"}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                J.A.R.V.I.S. Core Protocol Matrix • LTC VTR & Multi-Modal Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center gap-6 px-6 border-b text-xs font-mono uppercase tracking-wider overflow-x-auto ${
            isDark ? "border-cyan-900/40 bg-slate-950/30" : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <button
            onClick={() => setActiveTab("realtime")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "realtime"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "大模型与多模态提供商" : "LLM & Realtime Providers"}</span>
          </button>

          <button
            onClick={() => setActiveTab("mcp")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "mcp"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "MCP 诊断服务与工具扩展" : "MCP Services & Diagnostics"}</span>
          </button>

          <button
            onClick={() => setActiveTab("api")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "api"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "Gemini 快速密钥" : "Gemini API Key"}</span>
          </button>

          <button
            onClick={() => setActiveTab("wakeword")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "wakeword"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "语音唤醒 (利通虾/Jarvis)" : "Wake Words"}</span>
          </button>

          <button
            onClick={() => setActiveTab("deploy")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "deploy"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "本地部署说明" : "Local Deploy"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: Realtime & LLM Providers */}
          {activeTab === "realtime" && localProviderDraft && (
            <div className="space-y-6">
              {/* Provider Selection & Overview Bar */}
              <div
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? "bg-slate-950/60 border-cyan-900/40" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex-1">
                  <label className="block text-xs font-mono uppercase tracking-wider mb-1 font-semibold text-cyan-400">
                    {lang === "zh" ? "当前配置的模型网关提供方" : "Select Provider Gateway"}
                  </label>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => handleProviderSelect(e.target.value)}
                    className={selectClass}
                  >
                    {realtimeProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isUnifiedMultimodal ? "• [原生统一多模态]" : `• [${p.protocol}]`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localProviderDraft.enabled}
                      onChange={(e) =>
                        setLocalProviderDraft({ ...localProviderDraft, enabled: e.target.checked })
                      }
                      className="rounded border-cyan-700 text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>{lang === "zh" ? "启用此网关" : "Enable Gateway"}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{lang === "zh" ? "对话首选:" : "Chat Default:"}</span>
                    <button
                      type="button"
                      onClick={() => setActiveChatProviderId(localProviderDraft.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all ${
                        activeChatProviderId === localProviderDraft.id
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold"
                          : "border-slate-700 hover:border-slate-500 text-slate-400"
                      }`}
                    >
                      {activeChatProviderId === localProviderDraft.id
                        ? lang === "zh"
                          ? "✓ 当前默认"
                          : "✓ Active"
                        : lang === "zh"
                        ? "设为对话默认"
                        : "Set as Default"}
                    </button>
                  </div>
                </div>
              </div>

              {/* UNIFIED MULTIMODAL PROVIDER CASE (e.g. Gemini) */}
              {localProviderDraft.isUnifiedMultimodal ? (
                <div className="space-y-4">
                  {/* Explanatory Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                      isDark
                        ? "bg-cyan-950/20 border-cyan-500/30 text-slate-200"
                        : "bg-cyan-50/80 border-cyan-200 text-slate-800"
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0 animate-pulse" />
                    <div className="text-xs space-y-1.5 leading-relaxed">
                      <div className="font-bold text-cyan-400 text-sm">
                        {lang === "zh" ? "原生统一多模态全家桶" : "Native Unified Multimodal Architecture"}
                      </div>
                      <p>
                        {lang === "zh"
                          ? "该提供商使用 Google Gemini 原生全模态内核，统一由同一套基础多模态模型无缝覆盖：双工实时流式语音、长文本智能理解推理、Google Search 事实接地、图像与视频生成。无需繁琐配置孤立分散的语音端点与文本端点，参数全局自动协同。"
                          : "This provider leverages the native multimodal Gemini foundation. The same model family natively handles duplex realtime audio, text reasoning, Google Search grounding, image generation, and video understanding without separate endpoints."}
                      </p>
                    </div>
                  </div>

                  {/* Unified Configuration Items */}
                  <div
                    className={`p-4 rounded-xl border space-y-4 ${
                      isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono font-semibold text-slate-300">
                          {lang === "zh" ? "环境变量名称 (支持 .env 文件)" : "API Key Env Binding"}
                        </label>
                        <input
                          type="text"
                          value={localProviderDraft.apiKeyEnv || "GEMINI_API_KEY"}
                          onChange={(e) =>
                            setLocalProviderDraft({ ...localProviderDraft, apiKeyEnv: e.target.value })
                          }
                          placeholder="GEMINI_API_KEY"
                          className={inputClass}
                        />
                        <span className="text-[11px] text-slate-500 font-mono">
                          {lang === "zh" ? "衬底默认: GEMINI_API_KEY (自动从系统与 .env 中读取)" : "Default: GEMINI_API_KEY"}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-mono font-semibold text-slate-300">
                          {lang === "zh" ? "Gemini 密钥 (手动覆盖，留空使用环境变量)" : "API Key (Optional override)"}
                        </label>
                        <input
                          type="password"
                          value={localProviderDraft.apiKey === "********" ? "" : localProviderDraft.apiKey || ""}
                          onChange={(e) =>
                            setLocalProviderDraft({ ...localProviderDraft, apiKey: e.target.value })
                          }
                          placeholder={
                            localProviderDraft.hasApiKey
                              ? lang === "zh"
                                ? "******** (已配置有效密钥，留空保持原值)"
                                : "******** (Configured, keep blank to retain)"
                              : lang === "zh"
                              ? "未设置，留空将读取 .env 中的 GEMINI_API_KEY"
                              : "Leave empty to use .env"
                          }
                          className={inputClass}
                        />
                        <span className="text-[11px] text-slate-500 font-mono">
                          {lang === "zh" ? "未修改时严格保持原值，不覆盖已保存的密钥" : "Untouched values are preserved safely"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-mono font-semibold text-slate-300">
                          {lang === "zh" ? "实时语音音色 (Voice)" : "Realtime Voice"}
                        </label>
                        <select
                          value={localProviderDraft.voice || "Fenrir"}
                          onChange={(e) =>
                            setLocalProviderDraft({ ...localProviderDraft, voice: e.target.value })
                          }
                          className={selectClass}
                        >
                          <option value="Fenrir">Fenrir (权威沉稳英伦男声)</option>
                          <option value="Zephyr">Zephyr (清雅亲和英伦女声)</option>
                          <option value="Puck">Puck (机敏灵动年轻音色)</option>
                          <option value="Charon">Charon (低沉磁性磁场音色)</option>
                          <option value="Kore">Kore (温润舒缓知性女声)</option>
                        </select>
                        <span className="text-[11px] text-slate-500 font-mono">默认音色: Fenrir</span>
                      </div>

                      <div>
                        <label className="block text-xs font-mono font-semibold text-slate-300">
                          {lang === "zh" ? "实时多模态模型" : "Live Model"}
                        </label>
                        <input
                          type="text"
                          value={localProviderDraft.model || ""}
                          onChange={(e) =>
                            setLocalProviderDraft({ ...localProviderDraft, model: e.target.value })
                          }
                          placeholder={localProviderDraft.defaults?.realtime?.model || "gemini-3.1-flash-live-preview"}
                          className={inputClass}
                        />
                        <span className="text-[11px] text-slate-500 font-mono">
                          衬底默认: {localProviderDraft.defaults?.realtime?.model || "gemini-3.1-flash-live-preview"}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-mono font-semibold text-slate-300">
                          {lang === "zh" ? "文本推理与检索模型" : "Text & Grounding Model"}
                        </label>
                        <input
                          type="text"
                          value={localProviderDraft.textModel || ""}
                          onChange={(e) =>
                            setLocalProviderDraft({ ...localProviderDraft, textModel: e.target.value })
                          }
                          placeholder={localProviderDraft.defaults?.text?.model || "gemini-3.8-flash"}
                          className={inputClass}
                        />
                        <span className="text-[11px] text-slate-500 font-mono">
                          衬底默认: {localProviderDraft.defaults?.text?.model || "gemini-3.8-flash"}
                        </span>
                      </div>
                    </div>

                    {/* Instant Test for Unified Multimodal */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestProviderModality("realtime")}
                          disabled={testingModality === `${localProviderDraft.id}-realtime`}
                          className={actionButtonClass}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              testingModality === `${localProviderDraft.id}-realtime` ? "animate-spin" : ""
                            }`}
                          />
                          <span>{lang === "zh" ? "即时测试 Gemini 全模态握手" : "Test Gemini Connectivity"}</span>
                        </button>

                        {testResults.realtime && (
                          <span
                            className={`text-xs font-mono flex items-center gap-1 ${
                              testResults.realtime.success ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {testResults.realtime.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {testResults.realtime.message}
                              {testResults.realtime.latencyMs ? ` (${testResults.realtime.latencyMs}ms)` : ""}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SEPARATE MODALITIES (Doubao Seed, OpenAI, Qwen, Custom) */
                <div className="space-y-4">
                  {/* MODALITY 1: Realtime Voice (Collapsible) */}
                  <div
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div
                      onClick={() => toggleSection("realtime")}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <Radio className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
                          {lang === "zh" ? "1. 实时双工语音参数配置 (Realtime Voice)" : "1. Realtime Voice Protocol"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono">
                          {localProviderDraft.protocol}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[11px] font-mono">
                          {collapsedSections.realtime ? (lang === "zh" ? "展开" : "Expand") : (lang === "zh" ? "折叠" : "Collapse")}
                        </span>
                        {collapsedSections.realtime ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {!collapsedSections.realtime && (
                      <div className="p-4 border-t border-slate-800 space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              WebSocket 服务端点 (Endpoint)
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.endpoint || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, endpoint: e.target.value })
                              }
                              placeholder={localProviderDraft.defaults?.realtime?.endpoint || "wss://..."}
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">
                              默认衬底: {localProviderDraft.defaults?.realtime?.endpoint || "未指定 (自定义)"}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              语音模型标识 (Model)
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.model || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, model: e.target.value })
                              }
                              placeholder={localProviderDraft.defaults?.realtime?.model || "model-name"}
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">
                              默认衬底: {localProviderDraft.defaults?.realtime?.model || "未指定"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              音色代码 (Voice ID)
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.voice || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, voice: e.target.value })
                              }
                              placeholder={localProviderDraft.defaults?.realtime?.voice || "default-voice"}
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">
                              默认衬底: {localProviderDraft.defaults?.realtime?.voice || "default"}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              环境变量绑定 (Env Var)
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.apiKeyEnv || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, apiKeyEnv: e.target.value })
                              }
                              placeholder="VOLCENGINE_API_KEY"
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">优先从 .env 读取</span>
                          </div>

                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              语音 API Key (手动覆盖)
                            </label>
                            <input
                              type="password"
                              value={localProviderDraft.apiKey === "********" ? "" : localProviderDraft.apiKey || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, apiKey: e.target.value })
                              }
                              placeholder={
                                localProviderDraft.hasApiKey
                                  ? "******** (已配置有效密钥，留空保持原值)"
                                  : "留空继承环境变量"
                              }
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">留空保持原值</span>
                          </div>
                        </div>

                        {/* Modality Test Button */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleTestProviderModality("realtime")}
                            disabled={testingModality === `${localProviderDraft.id}-realtime`}
                            className={actionButtonClass}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                testingModality === `${localProviderDraft.id}-realtime` ? "animate-spin" : ""
                              }`}
                            />
                            <span>{lang === "zh" ? "即时测试实时语音链路" : "Test Realtime Voice"}</span>
                          </button>

                          {testResults.realtime && (
                            <span
                              className={`text-xs font-mono flex items-center gap-1 ${
                                testResults.realtime.success ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {testResults.realtime.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {testResults.realtime.message}
                                {testResults.realtime.latencyMs ? ` (${testResults.realtime.latencyMs}ms)` : ""}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MODALITY 2: Text / Chat (Collapsible) */}
                  <div
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div
                      onClick={() => toggleSection("text")}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
                          {lang === "zh" ? "2. 文本与对话推理配置 (Text / Chat LLM)" : "2. Text Chat Protocol"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-mono">
                          {localProviderDraft.textProtocol || "openai-compatible"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[11px] font-mono">
                          {collapsedSections.text ? (lang === "zh" ? "展开" : "Expand") : (lang === "zh" ? "折叠" : "Collapse")}
                        </span>
                        {collapsedSections.text ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {!collapsedSections.text && (
                      <div className="p-4 border-t border-slate-800 space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              HTTP / SSE 端点 (Text Endpoint)
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.textEndpoint || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, textEndpoint: e.target.value })
                              }
                              placeholder={localProviderDraft.defaults?.text?.endpoint || "https://.../chat/completions"}
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">
                              默认衬底: {localProviderDraft.defaults?.text?.endpoint || "未指定"}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              文本模型名称 (Text Model)
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.textModel || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, textModel: e.target.value })
                              }
                              placeholder={localProviderDraft.defaults?.text?.model || "model-name"}
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">
                              默认衬底: {localProviderDraft.defaults?.text?.model || "未指定"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              文本协议类型
                            </label>
                            <select
                              value={localProviderDraft.textProtocol || "openai-compatible"}
                              onChange={(e) =>
                                setLocalProviderDraft({
                                  ...localProviderDraft,
                                  textProtocol: e.target.value as any,
                                })
                              }
                              className={selectClass}
                            >
                              <option value="openai-compatible">OpenAI Compatible (SSE/REST)</option>
                              <option value="gemini">Gemini Protocol</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              文本密钥环境变量绑定
                            </label>
                            <input
                              type="text"
                              value={localProviderDraft.textApiKeyEnv || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, textApiKeyEnv: e.target.value })
                              }
                              placeholder="VOLCENGINE_TEXT_API_KEY"
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">优先从 .env 读取</span>
                          </div>

                          <div>
                            <label className="block text-xs font-mono font-semibold text-slate-300">
                              文本 API Key (留空保持原值)
                            </label>
                            <input
                              type="password"
                              value={localProviderDraft.textApiKey === "********" ? "" : localProviderDraft.textApiKey || ""}
                              onChange={(e) =>
                                setLocalProviderDraft({ ...localProviderDraft, textApiKey: e.target.value })
                              }
                              placeholder={
                                localProviderDraft.hasTextApiKey
                                  ? "******** (已配置有效密钥，留空保持原值)"
                                  : "留空继承环境变量"
                              }
                              className={inputClass}
                            />
                            <span className="text-[10px] text-slate-500 font-mono">未修改时自动继承原值</span>
                          </div>
                        </div>

                        {/* Modality Test Button */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleTestProviderModality("text")}
                            disabled={testingModality === `${localProviderDraft.id}-text`}
                            className={actionButtonClass}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                testingModality === `${localProviderDraft.id}-text` ? "animate-spin" : ""
                              }`}
                            />
                            <span>{lang === "zh" ? "即时测试文本推理响应" : "Test Text Reasoning"}</span>
                          </button>

                          {testResults.text && (
                            <span
                              className={`text-xs font-mono flex items-center gap-1 ${
                                testResults.text.success ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {testResults.text.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {testResults.text.message}
                                {testResults.text.latencyMs ? ` (${testResults.text.latencyMs}ms)` : ""}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MODALITY 3: Image / Vision (Collapsible, only if supported) */}
                  {localProviderDraft.supportedModalities?.includes("image") && (
                    <div
                      className={`rounded-xl border overflow-hidden transition-all ${
                        isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
                      }`}
                    >
                      <div
                        onClick={() => toggleSection("image")}
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/20"
                      >
                        <div className="flex items-center gap-2.5">
                          <ImageIcon className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
                            {lang === "zh" ? "3. 图像生成与视觉 (Image / Vision)" : "3. Image Generation"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-[11px] font-mono">
                            {collapsedSections.image ? (lang === "zh" ? "展开" : "Expand") : (lang === "zh" ? "折叠" : "Collapse")}
                          </span>
                          {collapsedSections.image ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {!collapsedSections.image && (
                        <div className="p-4 border-t border-slate-800 space-y-3.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-mono font-semibold text-slate-300">
                                图像模型端点 (Image Endpoint)
                              </label>
                              <input
                                type="text"
                                value={localProviderDraft.imageEndpoint || ""}
                                onChange={(e) =>
                                  setLocalProviderDraft({ ...localProviderDraft, imageEndpoint: e.target.value })
                                }
                                placeholder={localProviderDraft.defaults?.image?.endpoint || "https://.../images/generations"}
                                className={inputClass}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-mono font-semibold text-slate-300">
                                图像模型名称 (Image Model)
                              </label>
                              <input
                                type="text"
                                value={localProviderDraft.imageModel || ""}
                                onChange={(e) =>
                                  setLocalProviderDraft({ ...localProviderDraft, imageModel: e.target.value })
                                }
                                placeholder={localProviderDraft.defaults?.image?.model || "dall-e-3"}
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODALITY 4: Custom Headers & Dynamic Env Interpolation (Collapsible) */}
                  <div
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div
                      onClick={() => toggleSection("headers")}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
                          {lang === "zh" ? "高级请求头与动态环境变量插值" : "Advanced Headers & Env Interpolation"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[11px] font-mono">
                          {collapsedSections.headers ? (lang === "zh" ? "展开" : "Expand") : (lang === "zh" ? "折叠" : "Collapse")}
                        </span>
                        {collapsedSections.headers ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {!collapsedSections.headers && (
                      <div className="p-4 border-t border-slate-800 space-y-3">
                        <p className="text-xs text-slate-400">
                          {lang === "zh"
                            ? "支持在请求头配置中写入形如 ${MY_SECRET_KEY} 的占位符，服务端会自动从环境或 .env 中安全替换，杜绝前端暴露敏感凭据。"
                            : "Supports ${ENV_NAME} template syntax. Variables are resolved securely on the server."}
                        </p>
                        <div className="space-y-2 font-mono text-xs">
                          {Object.entries(localProviderDraft.headers || {}).map(([hKey, hVal]) => (
                            <div key={hKey} className="flex items-center gap-2">
                              <span className="text-cyan-400 font-semibold w-40 truncate">{hKey}:</span>
                              <input
                                type="text"
                                value={hVal}
                                onChange={(e) => {
                                  const updatedHeaders = { ...localProviderDraft.headers, [hKey]: e.target.value };
                                  setLocalProviderDraft({ ...localProviderDraft, headers: updatedHeaders });
                                }}
                                className={inputClass}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Bar for Provider Tab */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 font-mono">
                  {lang === "zh" ? "• 各参数具有默认衬底提示，未显式修改时安全保留原值" : "• Defaults are watermarked"}
                </span>
                <button
                  type="button"
                  onClick={handleSaveProvider}
                  disabled={isSaving}
                  className={actionButtonClass}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? (lang === "zh" ? "保存中..." : "Saving...") : lang === "zh" ? "保存当前网关配置" : "Save Provider"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-MCP Services & Diagnostics */}
          {activeTab === "mcp" && (
            <div className="space-y-6">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDark ? "bg-slate-950/60 border-cyan-900/40" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-cyan-400">
                    <Server className="w-4 h-4" />
                    <span>{lang === "zh" ? "MCP 诊断服务与工具矩阵" : "MCP Service & Tool Matrix"}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === "zh"
                      ? "支持动态添加多个远端/本地 MCP 服务，支持 SSE (Server-Sent Events) 与 Streaming HTTP 双协议。激活的服务将直接挂载至 Jarvis 会话中供大模型智能调用。"
                      : "Manage multiple MCP servers with SSE and Streaming HTTP protocols. Enabled tools are injected into model tool-call scopes."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMcpModal(true)}
                  className="px-3 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "zh" ? "扩展新 MCP 服务" : "Add MCP Server"}</span>
                </button>
              </div>

              {/* MCP Servers List */}
              <div className="space-y-4">
                {mcpServers.map((server) => {
                  const sId = server.id || server.key;
                  const testRes = serverTestResults[sId];
                  const isTesting = testingServerId === sId;

                  return (
                    <div
                      key={sId}
                      className={`p-4 rounded-xl border transition-all ${
                        server.enabled
                          ? isDark
                            ? "bg-slate-950/60 border-cyan-800/60 shadow-md shadow-cyan-950/20"
                            : "bg-white border-cyan-300 shadow-sm"
                          : isDark
                          ? "bg-slate-950/30 border-slate-800 opacity-70"
                          : "bg-slate-100 border-slate-300 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleMcpServer(server)}
                            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                              server.enabled ? "bg-cyan-500" : isDark ? "bg-slate-800" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                                server.enabled ? "left-5.5" : "left-1"
                              }`}
                            />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm font-mono text-slate-100">{server.name}</span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                                  server.transport === "http"
                                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                                    : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                                }`}
                              >
                                {server.transport}
                              </span>
                              {server.enabled ? (
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  会话已挂载
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">已禁用</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md">{server.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestMcpServer(server)}
                            disabled={isTesting}
                            className={actionButtonClass}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                            <span>{lang === "zh" ? "即时连通测试" : "Test Connection"}</span>
                          </button>

                          {server.id !== "vtr-lane-service" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMcpServer(sId)}
                              className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="删除此服务"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Test Result Message */}
                      {testRes && (
                        <div
                          className={`mt-3 p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                            testRes.success
                              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                              : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {testRes.success ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>{testRes.message}</span>
                          </div>
                          {testRes.latencyMs && <span>延时: {testRes.latencyMs}ms</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add MCP Server Modal / Inlined Form */}
              {showAddMcpModal && (
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-950 border-cyan-500/40" : "bg-white border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
                      {lang === "zh" ? "注册新 MCP 协议服务 (支持 SSE 与 HTTP)" : "Register New MCP Server"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddMcpModal(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 font-semibold">服务名称</label>
                      <input
                        type="text"
                        value={newMcpServer.name || ""}
                        onChange={(e) => setNewMcpServer({ ...newMcpServer, name: e.target.value })}
                        placeholder="例如: ETC通行诊断服务器"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 font-semibold">传输协议</label>
                      <select
                        value={newMcpServer.transport || "http"}
                        onChange={(e) =>
                          setNewMcpServer({
                            ...newMcpServer,
                            transport: e.target.value as any,
                            url:
                              e.target.value === "sse"
                                ? "http://127.0.0.1:8790/sse"
                                : "http://127.0.0.1:8790/rpc",
                          })
                        }
                        className={selectClass}
                      >
                        <option value="http">Streaming HTTP / JSON-RPC (HTTP POST)</option>
                        <option value="sse">SSE (Server-Sent Events)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 font-semibold">
                        服务端点 URL (已填默认衬底参数)
                      </label>
                      <input
                        type="text"
                        value={newMcpServer.url || ""}
                        onChange={(e) => setNewMcpServer({ ...newMcpServer, url: e.target.value })}
                        placeholder={
                          newMcpServer.transport === "sse"
                            ? "http://127.0.0.1:8790/sse"
                            : "http://127.0.0.1:8790/rpc"
                        }
                        className={inputClass}
                      />
                      <span className="text-[10px] text-slate-500 font-mono">
                        默认衬底: {newMcpServer.transport === "sse" ? "http://127.0.0.1:8790/sse" : "http://127.0.0.1:8790/rpc"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 font-semibold">
                        鉴权密钥环境变量绑定 (支持 .env)
                      </label>
                      <input
                        type="text"
                        value={newMcpServer.apiKeyEnv || ""}
                        onChange={(e) => setNewMcpServer({ ...newMcpServer, apiKeyEnv: e.target.value })}
                        placeholder="VTR_MCP_API_KEY"
                        className={inputClass}
                      />
                      <span className="text-[10px] text-slate-500 font-mono">
                        默认衬底: VTR_MCP_API_KEY (通过 Header X-API-Key 传递)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMcpModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-mono border border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateMcpServer}
                      className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>确认添加并接入</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Fast Gemini API Key */}
          {activeTab === "api" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
                  Google Gemini API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={localGeminiKey}
                    onChange={(e) => setLocalGeminiKey(e.target.value)}
                    placeholder="留空将自动从服务端 .env 中的 GEMINI_API_KEY 继承"
                    className={`w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors ${
                      isDark
                        ? "bg-slate-950/80 border-cyan-800/40 text-slate-100 placeholder:text-slate-600"
                        : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border text-xs space-y-2 leading-relaxed ${
                  isDark
                    ? "bg-slate-950/50 border-cyan-900/30 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>本地部署与环境变量规范</span>
                </div>
                <p>
                  所有敏感数据优先采用环境变量并在本地由根目录 `.env` 文件驱动。界面中未显式修改的配置项将严格保持原值，保障您的私有凭证安全可靠。
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Wake Words */}
          {activeTab === "wakeword" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDark ? "bg-slate-950/60 border-cyan-900/40" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>{lang === "zh" ? "语音唤醒词常驻监听" : "Continuous Wake Word Listening"}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === "zh"
                      ? "利用浏览器语音识别在后台持续监听唤醒词，喊出唤醒词即可直接与 Jarvis 对话。"
                      : "Continuously listens for wake words in background using browser speech recognition."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleWakeWord(!wakeWordEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    wakeWordEnabled ? "bg-cyan-500" : isDark ? "bg-slate-800" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      wakeWordEnabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
                  {lang === "zh" ? "已激活的语音唤醒词清单" : "Active Voice Wake Words"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? "bg-slate-950/40 border-cyan-900/30" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-sm font-bold text-cyan-400">利通虾</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTestWakeWord("利通虾")}
                      className="text-xs font-mono px-2 py-1 rounded-md border border-cyan-800/40 hover:bg-cyan-950/40 text-cyan-300 cursor-pointer"
                    >
                      {lang === "zh" ? "测试唤醒" : "Test Wake"}
                    </button>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? "bg-slate-950/40 border-cyan-900/30" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-mono text-sm font-bold text-cyan-400">Jarvis</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTestWakeWord("Jarvis")}
                      className="text-xs font-mono px-2 py-1 rounded-md border border-cyan-800/40 hover:bg-cyan-950/40 text-cyan-300 cursor-pointer"
                    >
                      {lang === "zh" ? "测试唤醒" : "Test Wake"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Deployment Guide */}
          {activeTab === "deploy" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
                  {lang === "zh" ? "本地部署快速步骤 (4 步)" : "Local Deployment in 4 Steps"}
                </label>
                <div
                  className={`p-4 rounded-xl border font-mono text-xs overflow-x-auto space-y-3 ${
                    isDark ? "bg-slate-950 border-cyan-950/80 text-cyan-300" : "bg-slate-900 text-cyan-300"
                  }`}
                >
                  <div>
                    <span className="text-slate-500"># 1. 克隆代码仓库</span>
                    <br />
                    git clone https://github.com/jizhiguo/jarvis.git
                    <br />
                    cd jarvis
                  </div>
                  <div>
                    <span className="text-slate-500"># 2. 安装项目依赖</span>
                    <br />
                    npm install
                  </div>
                  <div>
                    <span className="text-slate-500"># 3. 配置本地环境变量 (.env)</span>
                    <br />
                    cp .env.example .env
                    <br />
                    <span className="text-slate-500"># 填写您的 GEMINI_API_KEY 与可选的 VTR_MCP_API_KEY</span>
                  </div>
                  <div>
                    <span className="text-slate-500"># 4. 启动本地开发服务</span>
                    <br />
                    npm run dev
                    <br />
                    <span className="text-slate-500"># 访问 http://localhost:3000 即可使用</span>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  isDark ? "bg-slate-950/50 border-cyan-900/30 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="font-semibold text-cyan-400">本地启动 VTR MCP Server 说明:</div>
                <p>
                  VTR 车辆轨迹重构 MCP 服务若运行在本地，只需监听端口 8790。本系统已预设自适应路由支持 SSE 与 Streaming HTTP 协议，无缝接入。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isDark ? "border-cyan-900/40 bg-slate-950/60" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === "zh" ? "所有配置已持久化保存（未变动参数保持原值）" : "Settings saved"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-mono border transition-colors cursor-pointer ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {lang === "zh" ? "关闭" : "Close"}
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? (lang === "zh" ? "保存中..." : "Saving...") : lang === "zh" ? "保存全局配置" : "Save Settings"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
