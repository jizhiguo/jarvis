import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { LiveConsole } from "./components/LiveConsole";
import { SearchModule } from "./components/SearchModule";
import { CreateModule } from "./components/CreateModule";
import { ReimagineModule } from "./components/ReimagineModule";
import { VtrModule } from "./components/VtrModule";
import { SettingsModal } from "./components/SettingsModal";
import { ActiveTab, ChatMessage, IllustrationItem, ReimagineItem, JarvisVoice, AppLanguage, AppTheme } from "./types";
import { getT } from "./i18n";
import { GaplessPcmPlayer, float32ToPcm16Base64 } from "./utils/audio";

export default function App() {
  const [lang, setLang] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem("jarvis_lang");
    return saved === "en" ? "en" : "zh";
  });

  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem("jarvis_theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem("jarvis_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("jarvis_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("console");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("jarvis_gemini_api_key") || "";
  });
  const [mcpUrl, setMcpUrl] = useState<string>(() => {
    return localStorage.getItem("jarvis_mcp_url") || "http://128.23.8.200:8790/sse";
  });
  const [mcpApiKey, setMcpApiKey] = useState<string>(() => {
    return localStorage.getItem("jarvis_mcp_api_key") || "vt********************************************5ab5";
  });
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(() => {
    return localStorage.getItem("jarvis_wake_word") !== "false";
  });

  const handleSaveGeminiApiKey = (key: string) => {
    setGeminiApiKey(key);
    if (key) {
      localStorage.setItem("jarvis_gemini_api_key", key);
    } else {
      localStorage.removeItem("jarvis_gemini_api_key");
    }
  };

  const handleSaveMcpConfig = async (url: string, apiKey: string): Promise<boolean> => {
    try {
      localStorage.setItem("jarvis_mcp_url", url);
      localStorage.setItem("jarvis_mcp_api_key", apiKey);
      setMcpUrl(url);
      setMcpApiKey(apiKey);

      const res = await fetch("/api/mcp/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : {}),
        },
        body: JSON.stringify({
          url,
          headers: { "X-API-Key": apiKey },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleToggleWakeWord = (enabled: boolean) => {
    setWakeWordEnabled(enabled);
    localStorage.setItem("jarvis_wake_word", enabled ? "true" : "false");
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-1",
      role: "jarvis",
      content:
        localStorage.getItem("jarvis_lang") === "en"
          ? "Good day, Sir. J.A.R.V.I.S. online and operating at full capacity.\n\nAll systems are synchronized:\n• Gemini Live API audio link primed\n• Google Search grounding matrix active\n• Nano Banana Pro illustration & camera reimagination cores standing by\n• VTR MCP Server (车辆轨迹重构 / LTC 利通虾) bridge connected.\n\nHow may I be of service today?"
          : "您好，先生。J.A.R.V.I.S. 智能系统全状态在线并全速运转中。\n\n各核心子系统已同步完成：\n• Gemini Live API 双工实时语音链路已就绪\n• Google Search 实时检索与事实接地已激活\n• Nano Banana Pro 插画生成与镜头肖像重塑核心待命\n• VTR MCP Server (车辆轨迹重构 / LTC 利通虾) 本地/远程诊断服务已接入\n\n请问今日有何吩咐？",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [illustrations, setIllustrations] = useState<IllustrationItem[]>([]);
  const [reimaginedItems, setReimaginedItems] = useState<ReimagineItem[]>([]);

  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [jarvisStatus, setJarvisStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [voice, setVoice] = useState<JarvisVoice>("Fenrir");
  const [isMuted, setIsMuted] = useState(false);

  // Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<GaplessPcmPlayer | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Gapless Player
  useEffect(() => {
    playerRef.current = new GaplessPcmPlayer((playing) => {
      setJarvisStatus((prev) => {
        if (playing) return "speaking";
        if (prev === "speaking") return isMicActive ? "listening" : "idle";
        return prev;
      });
    });

    return () => {
      playerRef.current?.close();
    };
  }, [isMicActive]);

  // Connect to Gemini Live WebSocket
  const connectLiveWebSocket = useCallback(() => {
    try {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const queryParam = geminiApiKey ? `?apiKey=${encodeURIComponent(geminiApiKey)}` : "";
      const wsUrl = `${protocol}//${window.location.host}/live${queryParam}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[Client] Connected to Jarvis Live WebSocket");
        setIsLiveConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "audio" && data.audio && !isMuted) {
            playerRef.current?.enqueueChunk(data.audio);
          } else if (data.type === "text" && data.text) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "jarvis" && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + data.text },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: "jarvis",
                    content: data.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    isStreaming: true,
                  },
                ];
              }
            });
          } else if (data.type === "turnComplete") {
            setMessages((prev) =>
              prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
            );
          } else if (data.type === "interrupted") {
            playerRef.current?.stop();
          } else if (data.type === "toolCall") {
            console.log("[Client] Tool Call received:", data.tool, data.args);
            if (data.tool === "searchWeb") {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: `Searching the web for "${data.args?.query}"...`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  actionType: "search",
                },
              ]);
            } else if (data.tool === "createIllustration") {
              setActiveTab("create");
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: `Synthesizing illustration with Nano Banana Pro: "${data.args?.prompt}"...`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  actionType: "create",
                },
              ]);
            } else if (data.tool === "reimagineUser") {
              setActiveTab("reimagine");
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: `Aligning optical sensors for photo reimagination: "${data.args?.stylePrompt}"...`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  actionType: "reimagine",
                },
              ]);
            } else if (data.tool === "vtrReconstructTrajectory" || data.tool === "vtr_reconstruct_trajectory") {
              setActiveTab("vtr");
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: `VTR (利通虾) 正在切片车道日志并重构车辆轨迹: [${data.args?.plateNumber || "车牌"}]...`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  actionType: "vtr",
                },
              ]);
            } else if (data.tool === "vtrDiagnoseLane" || data.tool === "vtr_diagnose_lane_logs") {
              setActiveTab("vtr");
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: `VTR 正在诊断车道 [${data.args?.laneId || "车道"}] 硬件通信及传感器日志...`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  actionType: "vtr",
                },
              ]);
            }
          } else if (data.type === "toolResult") {
            if (data.tool === "searchWeb" && data.result) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: data.result.summary || "Search complete.",
                  sources: data.result.sources || [],
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
            } else if ((data.tool === "vtrReconstructTrajectory" || data.tool === "vtr_reconstruct_trajectory") && data.result) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "jarvis",
                  content: data.result.diagnosticSummary || "车辆轨迹重构完成。",
                  vtrResult: data.result,
                  actionType: "vtr",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("[Client] WebSocket closed");
        setIsLiveConnected(false);
      };

      ws.onerror = (e) => {
        console.error("[Client] WebSocket error:", e);
        setIsLiveConnected(false);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WebSocket connection setup failed:", e);
      setIsLiveConnected(false);
    }
  }, [isMuted]);

  useEffect(() => {
    connectLiveWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, [connectLiveWebSocket]);

  // Start microphone capture at 16kHz PCM
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // ScriptProcessor for 16kHz PCM chunks
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const base64 = float32ToPcm16Base64(inputData);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "audio", audio: base64 }));
        }
      };

      // Audio level animation loop for Arc Reactor
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        setAudioLevel(avg);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      setIsMicActive(true);
      setJarvisStatus("listening");
    } catch (err) {
      console.error("Microphone access error:", err);
      setIsMicActive(false);
      setJarvisStatus("idle");
    }
  };

  // Stop microphone
  const stopMicrophone = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setIsMicActive(false);
    setAudioLevel(0);
    setJarvisStatus("idle");
  };

  const toggleMic = () => {
    if (isMicActive) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  };

  // Speak text aloud using Gemini TTS
  const speakText = async (text: string) => {
    if (isMuted || !text.trim()) return;

    try {
      setJarvisStatus("speaking");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : {}),
        },
        body: JSON.stringify({ text, voice }),
      });

      const data = await res.json();
      if (res.ok && data.audio) {
        playerRef.current?.enqueueChunk(data.audio);
      }
    } catch (e) {
      console.error("TTS playback error:", e);
    } finally {
      setJarvisStatus(isMicActive ? "listening" : "idle");
    }
  };

  // Handle conversational text message from input bar
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setJarvisStatus("processing");

    // Also send through Live WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", text }));
    }

    // Also call conversational chat endpoint with Google Search grounding
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      const jarvisMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "jarvis",
        content: data.reply,
        sources: data.sources || [],
        vtrResult: data.vtrResult,
        actionType: data.vtrResult ? "vtr" : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      speakText(data.reply.slice(0, 300));
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "jarvis",
          content: `My apologies, Sir. A telemetry anomaly occurred: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setJarvisStatus(isMicActive ? "listening" : "idle");
    }
  };

  const isDark = theme === "dark";
  const t = getT(lang);

  return (
    <div
      className={`min-h-screen ${
        isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
      } flex flex-col font-sans transition-colors duration-200 selection:bg-cyan-500 selection:text-slate-950`}
    >
      {/* Background Stark Tech Glow & Blueprint Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent_70%)]"
              : "bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_70%)]"
          }`}
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)]"
              : "bg-[linear-gradient(to_right,#082f4908_1px,transparent_1px),linear-gradient(to_bottom,#082f4908_1px,transparent_1px)]"
          } bg-[size:4rem_4rem]`}
        />
      </div>

      {/* Persistent Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLiveConnected={isLiveConnected}
        isMicActive={isMicActive}
        toggleMic={toggleMic}
        voice={voice}
        setVoice={setVoice}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 z-10">
        {activeTab === "console" && (
          <LiveConsole
            messages={messages}
            onSendMessage={handleSendMessage}
            isMicActive={isMicActive}
            toggleMic={toggleMic}
            isLiveConnected={isLiveConnected}
            reconnectLive={connectLiveWebSocket}
            jarvisStatus={jarvisStatus}
            audioLevel={audioLevel}
            setActiveTab={setActiveTab}
            lang={lang}
            theme={theme}
            onSpeakText={speakText}
          />
        )}

        {activeTab === "vtr" && (
          <VtrModule onSpeak={speakText} lang={lang} theme={theme} />
        )}

        {activeTab === "search" && (
          <SearchModule onSpeakText={speakText} lang={lang} theme={theme} />
        )}

        {activeTab === "create" && (
          <CreateModule
            illustrations={illustrations}
            onAddIllustration={(item) => setIllustrations((prev) => [item, ...prev])}
            onSpeakText={speakText}
            lang={lang}
            theme={theme}
          />
        )}

        {activeTab === "reimagine" && (
          <ReimagineModule
            reimaginedItems={reimaginedItems}
            onAddReimagineItem={(item) => setReimaginedItems((prev) => [item, ...prev])}
            onSpeakText={speakText}
            lang={lang}
            theme={theme}
          />
        )}
      </main>

      {/* Footer Status Bar */}
      <footer
        className={`border-t backdrop-blur-md px-4 py-2 text-center text-[11px] font-mono z-10 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full transition-colors ${
          isDark
            ? "border-cyan-950/60 bg-slate-950/80 text-slate-500"
            : "border-slate-200 bg-white/80 text-slate-500 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>
            {lang === "zh"
              ? "斯塔克工业 • 智能AI核心管控架构"
              : "STARK INDUSTRIES • ARTIFICIAL INTELLIGENCE CORE PROTOCOL"}
          </span>
        </div>
        <div>
          <span>
            POWERED BY GEMINI LIVE API • VTR MCP SERVER (LTC/利通虾) • GOOGLE SEARCH • NANO BANANA PRO
          </span>
        </div>
      </footer>

      {/* Settings & Local Deployment Config Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={handleSaveGeminiApiKey}
        mcpUrl={mcpUrl}
        mcpApiKey={mcpApiKey}
        onSaveMcpConfig={handleSaveMcpConfig}
        wakeWordEnabled={wakeWordEnabled}
        onToggleWakeWord={handleToggleWakeWord}
        onTestWakeWord={(kw) => {
          handleSendMessage(kw === "利通虾" ? "利通虾，帮我重构粤B88888通行记录" : "Jarvis, report system status");
          setIsSettingsOpen(false);
        }}
        lang={lang}
        theme={theme}
      />
    </div>
  );
}
