import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiApiKey: string;
  onSaveGeminiApiKey: (key: string) => void;
  mcpUrl: string;
  mcpApiKey: string;
  onSaveMcpConfig: (url: string, apiKey: string) => Promise<boolean>;
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
  wakeWordEnabled,
  onToggleWakeWord,
  onTestWakeWord,
  lang = "zh",
  theme = "dark",
}) => {
  const [activeTab, setActiveTab] = useState<"api" | "mcp" | "wakeword" | "deploy">("api");
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [localMcpUrl, setLocalMcpUrl] = useState(mcpUrl);
  const [localMcpKey, setLocalMcpKey] = useState(mcpApiKey);
  const [showMcpKey, setShowMcpKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const t = getT(lang);
  const isDark = theme === "dark";

  useEffect(() => {
    setLocalGeminiKey(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    setLocalMcpUrl(mcpUrl);
    setLocalMcpKey(mcpApiKey);
  }, [mcpUrl, mcpApiKey]);

  if (!isOpen) return null;

  const handleTestMcp = async () => {
    setTestStatus("testing");
    setTestMessage(lang === "zh" ? "正在探测 MCP 状态..." : "Testing MCP endpoint...");
    try {
      const res = await fetch("/api/mcp/status");
      const data = await res.json();
      if (data.status === "connected") {
        setTestStatus("success");
        setTestMessage(lang === "zh" ? "✓ 成功连接至 VTR MCP 服务端" : "✓ Connected to VTR MCP Server");
      } else {
        setTestStatus("error");
        setTestMessage(
          lang === "zh"
            ? `端点未就绪: ${data.message || "内置仿真诊断待命"}`
            : `Endpoint unreachable: ${data.message || "Built-in fallback active"}`
        );
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(lang === "zh" ? `探测失败: ${err.message}` : `Test failed: ${err.message}`);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    onSaveGeminiApiKey(localGeminiKey.trim());
    await onSaveMcpConfig(localMcpUrl.trim(), localMcpKey.trim());
    setIsSaving(false);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
    }, 2500);
  };

  const applyMcpPreset = (type: "localhost" | "remote") => {
    if (type === "localhost") {
      setLocalMcpUrl("http://localhost:8790/sse");
      setLocalMcpKey("vt-local-mcp-dev-key");
    } else {
      setLocalMcpUrl("http://128.23.8.200:8790/sse");
      setLocalMcpKey("vt********************************************5ab5");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all ${
          isDark
            ? "bg-slate-900 border-cyan-800/40 text-slate-100 shadow-cyan-950/40"
            : "bg-white border-slate-200 text-slate-800 shadow-xl"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? "border-cyan-900/40 bg-slate-950/40" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">
                {lang === "zh" ? "系统配置与本地部署设置" : "System & Local Deployment Settings"}
              </h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {lang === "zh"
                  ? "配置各 API Key、VTR MCP 服务端地址及语音唤醒词"
                  : "Configure API keys, VTR MCP endpoints & voice wake words"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark
                ? "border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                : "border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          className={`flex items-center px-6 border-b gap-4 text-xs font-mono font-medium ${
            isDark ? "border-cyan-900/30 bg-slate-950/20" : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <button
            onClick={() => setActiveTab("api")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "api"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gemini API Key</span>
          </button>

          <button
            onClick={() => setActiveTab("mcp")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "mcp"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>VTR MCP (X-API-Key)</span>
          </button>

          <button
            onClick={() => setActiveTab("wakeword")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "wakeword"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "语音唤醒词 (利通虾/Jarvis)" : "Wake Words"}</span>
          </button>

          <button
            onClick={() => setActiveTab("deploy")}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "deploy"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "本地部署指南" : "Local Deploy"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: Gemini API Key */}
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
                    placeholder={
                      lang === "zh"
                        ? "留空将使用服务器环境变量 GEMINI_API_KEY"
                        : "Leave empty to use server GEMINI_API_KEY from .env"
                    }
                    className={`w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono border focus:outline-hidden focus:ring-1 focus:ring-cyan-400 transition-colors ${
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
                  isDark ? "bg-slate-950/50 border-cyan-900/30 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === "zh" ? "本地部署配置说明" : "Local Deployment Instructions"}</span>
                </div>
                <p>
                  {lang === "zh"
                    ? "在本地运行本项目时，只需在根目录下创建或复制 .env 文件，并设置 GEMINI_API_KEY=your_key。此处输入的 API Key 会保存在浏览器缓存并在请求时优先透传，便于调试与演示。"
                    : "When running locally, create or copy .env and define GEMINI_API_KEY=your_key. Keys entered here are persisted in local browser storage and sent in request headers for easy testing."}
                </p>
                <p className="font-mono text-[11px] text-cyan-400/80">
                  支持模型: gemini-3.8-flash, gemini-3.1-flash-live-preview, gemini-3-pro-image (Nano Banana Pro)
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: VTR MCP Server & X-API-Key */}
          {activeTab === "mcp" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
                  {lang === "zh" ? "快速预设环境切换" : "Quick Environment Presets"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyMcpPreset("localhost")}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono text-left flex items-center gap-2 transition-all ${
                      localMcpUrl.includes("localhost") || localMcpUrl.includes("127.0.0.1")
                        ? "border-cyan-400 bg-cyan-500/10 text-cyan-400 font-bold"
                        : isDark
                        ? "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>本地部署 (localhost:8790)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyMcpPreset("remote")}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono text-left flex items-center gap-2 transition-all ${
                      localMcpUrl.includes("128.23.8.200")
                        ? "border-cyan-400 bg-cyan-500/10 text-cyan-400 font-bold"
                        : isDark
                        ? "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>远程集群 (128.23.8.200)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
                  VTR MCP Server URL (SSE Transport)
                </label>
                <input
                  type="text"
                  value={localMcpUrl}
                  onChange={(e) => setLocalMcpUrl(e.target.value)}
                  placeholder="http://localhost:8790/sse"
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono border focus:outline-hidden focus:ring-1 focus:ring-cyan-400 transition-colors ${
                    isDark
                      ? "bg-slate-950/80 border-cyan-800/40 text-slate-100 placeholder:text-slate-600"
                      : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
                  MCP X-API-Key 鉴权令牌
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showMcpKey ? "text" : "password"}
                    value={localMcpKey}
                    onChange={(e) => setLocalMcpKey(e.target.value)}
                    placeholder="vt-local-mcp-dev-key"
                    className={`w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono border focus:outline-hidden focus:ring-1 focus:ring-cyan-400 transition-colors ${
                      isDark
                        ? "bg-slate-950/80 border-cyan-800/40 text-slate-100 placeholder:text-slate-600"
                        : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMcpKey(!showMcpKey)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showMcpKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ping Test Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestMcp}
                  disabled={testStatus === "testing"}
                  className="px-4 py-2 rounded-xl border border-cyan-700/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                  <span>{lang === "zh" ? "测试 MCP 连通性" : "Test MCP Connection"}</span>
                </button>

                {testMessage && (
                  <span
                    className={`text-xs font-mono ${
                      testStatus === "success"
                        ? "text-emerald-400"
                        : testStatus === "error"
                        ? "text-amber-400"
                        : "text-slate-400"
                    }`}
                  >
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Wake Words */}
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

              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  isDark ? "bg-slate-950/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="font-semibold text-slate-300">使用提示:</div>
                <p>• 说出“利通虾”或“Jarvis”，系统将立刻发出应答提示音，并进入语音交互状态。</p>
                <p>• 您还可以直接一气呵成：“利通虾，帮我重构粤B88888通行记录”，系统会自动切分指令并开始执行！</p>
              </div>
            </div>
          )}

          {/* TAB 4: Local Deployment Instructions */}
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
                    git clone &lt;repo-url&gt;
                    <br />
                    cd jarvis-ai-assistant
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
                  VTR 车辆轨迹重构 MCP 服务若运行在本地，只需确保监听在端口 8790（例如通过 Python FastMCP
                  启动）。本前端与后台服务已预设直接代理 `http://localhost:8790/sse`。
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
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === "zh" ? "配置已保存至本地与服务端" : "Settings saved"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-mono border transition-colors ${
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
              <span>{isSaving ? (lang === "zh" ? "保存中..." : "Saving...") : lang === "zh" ? "保存配置" : "Save Settings"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
