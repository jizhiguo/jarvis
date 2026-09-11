import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Search,
  Camera,
  ExternalLink,
  Volume2,
  AlertCircle,
  Radio,
  RefreshCw,
  Car,
  ArrowRight,
  Maximize2,
  Minimize2,
  Zap,
} from "lucide-react";
import { ArcReactor } from "./ArcReactor";
import { ChatMessage, ActiveTab, AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";
import { useWakeWord, WakeWordResult } from "../utils/useWakeWord";

interface LiveConsoleProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isMicActive: boolean;
  toggleMic: () => void;
  isLiveConnected: boolean;
  reconnectLive: () => void;
  jarvisStatus: "idle" | "listening" | "processing" | "speaking";
  audioLevel: number;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectImagePrompt?: (prompt: string) => void;
  onSelectReimagineStyle?: (style: string) => void;
  lang?: AppLanguage;
  theme?: AppTheme;
  onSpeakText?: (text: string) => void;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({
  messages,
  onSendMessage,
  isMicActive,
  toggleMic,
  isLiveConnected,
  reconnectLive,
  jarvisStatus,
  audioLevel,
  setActiveTab,
  onSelectImagePrompt,
  onSelectReimagineStyle,
  lang = "zh",
  theme = "dark",
  onSpeakText,
}) => {
  const [inputText, setInputText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState<boolean>(() => {
    return localStorage.getItem("jarvis_wake_word") !== "false";
  });
  const [wakeNotice, setWakeNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = getT(lang);
  const isDark = theme === "dark";

  const handleWakeWordDetected = useCallback(
    (result: WakeWordResult) => {
      const noticeText =
        lang === "zh"
          ? `🎯 唤醒词已激活: 【${result.keyword}】`
          : `🎯 Wake Word Triggered: [${result.keyword}]`;
      setWakeNotice(noticeText);
      setTimeout(() => setWakeNotice(null), 3500);

      // Jarvis audio feedback
      if (onSpeakText) {
        onSpeakText(lang === "zh" ? "在的，先生。请吩咐。" : "Yes, Sir? Standing by.");
      }

      if (result.commandText) {
        onSendMessage(result.commandText);
      } else if (!isMicActive) {
        toggleMic();
      }
    },
    [lang, onSpeakText, onSendMessage, isMicActive, toggleMic]
  );

  const { isSupported: isWakeSupported, isListening: isWakeListening, triggerSimulation } =
    useWakeWord({
      enabled: wakeWordActive,
      onWakeWord: handleWakeWordDetected,
      lang,
    });

  const toggleWakeWord = () => {
    const next = !wakeWordActive;
    setWakeWordActive(next);
    localStorage.setItem("jarvis_wake_word", next ? "true" : "false");
  };

  // Fullscreen keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const sampleVoicePrompts = [
    {
      text: t.promptVtr,
      type: "vtr" as const,
      icon: <Car className="w-3.5 h-3.5 text-cyan-400" />,
    },
    {
      text: t.promptSearch,
      type: "search" as const,
      icon: <Search className="w-3.5 h-3.5 text-cyan-400" />,
    },
    {
      text: t.promptCreate,
      type: "create" as const,
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      text: t.promptReimagine,
      type: "reimagine" as const,
      icon: <Camera className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      text: t.promptTalk,
      type: "talk" as const,
      icon: <Radio className="w-3.5 h-3.5 text-blue-400" />,
    },
  ];

  const content = (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${
        isFullscreen ? "flex-1 w-full max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-hidden" : "h-full"
      }`}
    >
      {/* Left Column: Arc Reactor HUD & Holographic Core */}
      <div
        className={`lg:col-span-5 flex flex-col items-center justify-between p-6 rounded-2xl border backdrop-blur-md shadow-2xl relative overflow-hidden min-h-[420px] transition-colors ${
          isDark
            ? "bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-cyan-900/30 text-slate-100"
            : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        {/* Background circuit lines overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Top Telemetry Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span
              className={`text-xs font-mono tracking-widest uppercase font-bold ${
                isDark ? "text-cyan-400/90" : "text-cyan-800"
              }`}
            >
              {t.hudTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Fullscreen HUD Toggle */}
            <button
              id="hud-fullscreen-btn"
              onClick={toggleFullscreen}
              title={
                isFullscreen
                  ? lang === "zh"
                    ? "退出全屏 (ESC)"
                    : "Exit Fullscreen (ESC)"
                  : lang === "zh"
                  ? "HUD 全屏模式"
                  : "HUD Fullscreen Mode"
              }
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isFullscreen
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-sm shadow-cyan-500/30"
                  : isDark
                  ? "bg-slate-900 border-cyan-800/40 text-slate-400 hover:text-cyan-300"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-cyan-700"
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={reconnectLive}
              title={t.reconnectLive}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? "bg-slate-900 border-cyan-800/40 text-slate-400 hover:text-cyan-300"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-cyan-700"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Wake Word Trigger Notification Banner */}
        {wakeNotice && (
          <div className="w-full my-2 px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-mono text-center animate-bounce shadow-md shadow-cyan-500/30 z-20">
            {wakeNotice}
          </div>
        )}

        {/* Central Arc Reactor */}
        <div className="my-auto py-4 z-10 flex flex-col items-center">
          <ArcReactor
            status={jarvisStatus}
            audioLevel={audioLevel}
            size="lg"
            onClick={toggleMic}
          />
        </div>

        {/* Voice Wake Words Status & Quick Test Matrix */}
        <div
          className={`w-full p-3 rounded-xl border z-10 mb-3 text-xs font-mono transition-colors ${
            isDark ? "bg-slate-950/70 border-cyan-900/40" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  wakeWordActive && isWakeListening
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"
                    : "bg-slate-500"
                }`}
              />
              <span className="font-semibold text-[11px] text-cyan-400">
                {lang === "zh" ? "语音唤醒词:" : "Wake Words:"}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleWakeWord}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                wakeWordActive
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 font-semibold"
                  : "border-slate-700 bg-slate-800 text-slate-400"
              }`}
            >
              {wakeWordActive
                ? lang === "zh"
                  ? "监听就绪 (ON)"
                  : "Active"
                : lang === "zh"
                ? "已静音 (OFF)"
                : "Disabled"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerSimulation("利通虾", lang === "zh" ? "帮我重构车辆轨迹" : "reconstruct vehicle trajectory")}
              title={lang === "zh" ? "点击测试唤醒词: 利通虾" : "Click to test wake word: 利通虾"}
              className="flex-1 py-1 px-2 rounded-md border border-cyan-800/50 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-[11px] font-bold text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>利通虾</span>
            </button>

            <button
              type="button"
              onClick={() => triggerSimulation("Jarvis", lang === "zh" ? "汇报系统状态" : "system status report")}
              title={lang === "zh" ? "点击测试唤醒词: Jarvis" : "Click to test wake word: Jarvis"}
              className="flex-1 py-1 px-2 rounded-md border border-cyan-800/50 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-[11px] font-bold text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Jarvis</span>
            </button>
          </div>
        </div>

        {/* Audio / Mic Control Bar */}
        <div className="w-full flex flex-col items-center gap-3 z-10">
          <div className="flex items-center gap-3">
            <button
              id="live-mic-large-btn"
              onClick={toggleMic}
              className={`flex items-center gap-3 px-6 py-3 rounded-full font-mono text-sm tracking-wider font-semibold transition-all shadow-lg cursor-pointer ${
                isMicActive
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30 animate-pulse"
                  : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/30"
              }`}
            >
              {isMicActive ? (
                <>
                  <Mic className="w-5 h-5" />
                  <span>{t.micBtnActive}</span>
                </>
              ) : (
                <>
                  <MicOff className="w-5 h-5" />
                  <span>{t.micBtnIdle}</span>
                </>
              )}
            </button>
          </div>

          <p
            className={`text-[11px] font-mono text-center ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {isLiveConnected
              ? lang === "zh"
                ? "Gemini Live API 实时音频流已建立 (16kHz PCM 输入 / 24kHz 双工合成)"
                : "Gemini Live API active at 16kHz PCM input / 24kHz audio synthesis"
              : lang === "zh"
              ? "正在同步 Gemini Live 链路..."
              : "Connecting to Gemini Live link..."}
          </p>
        </div>
      </div>

      {/* Right Column: Interaction Terminal & Subtitle Transcript */}
      <div
        className={`lg:col-span-7 flex flex-col h-full rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden min-h-[520px] transition-colors ${
          isDark
            ? "bg-slate-900/80 border-cyan-900/30 text-slate-100"
            : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        {/* Terminal Header */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between ${
            isDark
              ? "border-cyan-900/40 bg-slate-950/60"
              : "border-slate-200 bg-slate-100/70"
          }`}
        >
          <div
            className={`flex items-center gap-2 font-mono text-xs font-semibold tracking-wider ${
              isDark ? "text-cyan-300" : "text-cyan-800"
            }`}
          >
            <Radio className="w-4 h-4 text-cyan-500" />
            <span>{t.terminalTitle}</span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? "bg-cyan-950 border-cyan-800/40 text-cyan-400"
                : "bg-cyan-100 border-cyan-300 text-cyan-800 font-semibold"
            }`}
          >
            {messages.length} {t.entriesCount}
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar max-h-[480px]">
          {messages.length === 0 ? (
            <div
              className={`h-full flex flex-col items-center justify-center text-center p-6 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <ArcReactor status="idle" size="sm" />
              <h3
                className={`mt-4 font-mono font-bold text-sm tracking-wider ${
                  isDark ? "text-cyan-300" : "text-cyan-800"
                }`}
              >
                {t.telemetryStandby}
              </h3>
              <p className="text-xs mt-1 max-w-sm">
                {lang === "zh"
                  ? "请对着麦克风说话，或选择下方快捷指令开始与 J.A.R.V.I.S. 交互。"
                  : "Speak directly into your microphone or choose one of the commands below to begin."}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isJarvis = msg.role === "jarvis";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isJarvis ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span
                      className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {isJarvis ? "J.A.R.V.I.S." : "USER"}
                    </span>
                    <span
                      className={`text-[9px] font-mono ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isJarvis
                        ? isDark
                          ? "bg-slate-950/90 text-slate-200 border border-cyan-900/40 shadow-xs"
                          : "bg-slate-100 text-slate-800 border border-slate-200 shadow-xs"
                        : "bg-cyan-600 text-white font-medium rounded-tr-none shadow-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* VTR Trajectory Summary Card */}
                    {msg.vtrResult && (
                      <div
                        className={`mt-3 p-3 rounded-xl space-y-2 border ${
                          isDark
                            ? "bg-slate-900/90 border-cyan-500/40"
                            : "bg-white border-cyan-300 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex items-center gap-1.5 font-mono text-xs font-bold ${
                              isDark ? "text-cyan-300" : "text-cyan-800"
                            }`}
                          >
                            <Car className="w-3.5 h-3.5 text-cyan-500" />
                            <span>VTR 车辆轨迹切片: {msg.vtrResult.plateNumber}</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              msg.vtrResult.confidenceScore >= 90
                                ? isDark
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isDark
                                ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            置信度 {msg.vtrResult.confidenceScore}%
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-mono flex flex-wrap gap-x-4 gap-y-1 ${
                            isDark ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          <span>车道: {msg.vtrResult.laneId}</span>
                          <span>时速: {msg.vtrResult.speedKmh} km/h</span>
                          <span>耗时: {msg.vtrResult.durationMs}ms</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("vtr")}
                          className="text-[11px] font-mono text-cyan-500 hover:text-cyan-600 underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <span>进入 VTR 工作台查看全量轨迹与设备日志证据</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Grounding web sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div
                        className={`mt-3 pt-2.5 border-t ${
                          isDark ? "border-cyan-900/30" : "border-slate-200"
                        }`}
                      >
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-mono mb-1.5 ${
                            isDark ? "text-cyan-400" : "text-cyan-700 font-semibold"
                          }`}
                        >
                          <Search className="w-3 h-3" />
                          <span>GROUNDED GOOGLE SEARCH SOURCES:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
                                isDark
                                  ? "bg-slate-900 border-cyan-800/40 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400"
                                  : "bg-slate-200/80 border-slate-300 text-slate-800 hover:text-cyan-800 hover:border-cyan-500"
                              }`}
                            >
                              <span className="truncate max-w-[180px]">{s.title || s.url}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset Command Chips */}
        <div
          className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar ${
            isDark
              ? "border-cyan-900/30 bg-slate-950/40"
              : "border-slate-200 bg-slate-100/50"
          }`}
        >
          <span
            className={`text-[10px] font-mono shrink-0 uppercase tracking-wider ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {t.quickPrompts}
          </span>
          {sampleVoicePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(p.text)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                isDark
                  ? "bg-slate-900 border-cyan-900/40 hover:border-cyan-400/60 text-slate-300 hover:text-cyan-300"
                  : "bg-white border-slate-300 hover:border-cyan-500 text-slate-700 hover:text-cyan-800 shadow-2xs"
              }`}
            >
              {p.icon}
              <span className="truncate max-w-[220px]">{p.text}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className={`p-3 border-t flex items-center gap-2 ${
            isDark
              ? "bg-slate-950/80 border-cyan-900/40"
              : "bg-slate-100/80 border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isMicActive
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse"
                : isDark
                ? "bg-slate-900 border-cyan-900/40 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40"
                : "bg-white border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-400 shadow-2xs"
            }`}
            title="Toggle Voice Input"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            id="jarvis-command-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.inputPlaceholder}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-sans border transition-colors ${
              isDark
                ? "bg-slate-900/90 border-cyan-900/40 text-slate-200 placeholder-slate-500 focus:border-cyan-400/80"
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500 shadow-2xs"
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all shadow-md cursor-pointer"
            title={t.send}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl p-4 sm:p-6 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Fullscreen Banner Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-cyan-900/40 mb-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-sm font-mono tracking-widest font-bold text-cyan-300 uppercase">
              STARK INDUSTRIES • J.A.R.V.I.S. FULLSCREEN HOLO-HUD MATRIX
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              {lang === "zh" ? "按 ESC 或点击按钮退出全屏" : "Press ESC to exit fullscreen"}
            </span>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{lang === "zh" ? "退出全屏" : "Exit Fullscreen"}</span>
            </button>
          </div>
        </div>

        {content}
      </div>
    );
  }

  return content;
};
