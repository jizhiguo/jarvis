import React, { useState, useEffect } from "react";
import {
  Mic,
  Search,
  Sparkles,
  Camera,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  ShieldCheck,
  Car,
  Languages,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { ActiveTab, JarvisVoice, AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isLiveConnected: boolean;
  isMicActive: boolean;
  toggleMic: () => void;
  voice: JarvisVoice;
  setVoice: (v: JarvisVoice) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  lang: AppLanguage;
  setLang: (l: AppLanguage) => void;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isLiveConnected,
  isMicActive,
  toggleMic,
  voice,
  setVoice,
  isMuted,
  setIsMuted,
  lang,
  setLang,
  theme,
  setTheme,
  onOpenSettings,
}) => {
  const [time, setTime] = useState("");
  const t = getT(lang);
  const isDark = theme === "dark";

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: "console",
      label: t.navConsole,
      icon: <Radio className="w-4 h-4" />,
      badge: t.badgeLive,
    },
    {
      id: "vtr",
      label: t.navVtr,
      icon: <Car className="w-4 h-4" />,
      badge: t.badgeMcp,
    },
    {
      id: "search",
      label: t.navSearch,
      icon: <Search className="w-4 h-4" />,
      badge: t.badgeGrounded,
    },
    {
      id: "create",
      label: t.navCreate,
      icon: <Sparkles className="w-4 h-4" />,
      badge: t.badgeIllustration,
    },
    {
      id: "reimagine",
      label: t.navReimagine,
      icon: <Camera className="w-4 h-4" />,
      badge: t.badgeVision,
    },
  ];

  return (
    <header
      className={`border-b sticky top-0 z-40 px-4 py-3 backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? "border-cyan-900/40 bg-slate-950/90"
          : "border-cyan-200 bg-white/90 shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Telemetry */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isDark
                  ? "bg-cyan-950/80 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-cyan-50 border border-cyan-400 shadow-sm text-cyan-600"
              }`}
            >
              <Cpu className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-extrabold tracking-widest text-lg font-mono ${
                    isDark ? "text-cyan-300" : "text-cyan-800"
                  }`}
                >
                  {t.appTitle}
                </span>
                <span
                  className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                    isDark
                      ? "bg-cyan-950 border-cyan-500/40 text-cyan-400"
                      : "bg-cyan-50 border-cyan-300 text-cyan-700"
                  }`}
                >
                  v3.2
                </span>
              </div>
              <p
                className={`text-[11px] font-mono tracking-wider ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {lang === "zh" ? "斯塔克协议 • 智能多模态中枢" : "STARK PROTOCOL • MULTIMODAL CORE"}
              </p>
            </div>
          </div>

          <div
            className={`hidden sm:flex items-center gap-3 border-l pl-4 text-xs font-mono ${
              isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveConnected
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : "bg-amber-400"
                }`}
              />
              <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                {isLiveConnected ? t.liveConnected : t.liveDisconnected}
              </span>
            </div>
            <span className={isDark ? "text-slate-600" : "text-slate-300"}>|</span>
            <span className={isDark ? "text-cyan-400/80" : "text-cyan-700 font-semibold"}>
              {time}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex items-center overflow-x-auto no-scrollbar gap-1.5 p-1 rounded-xl border transition-colors ${
            isDark
              ? "bg-slate-900/90 border-cyan-900/30"
              : "bg-slate-100 border-slate-300/80"
          }`}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? isDark
                      ? "bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "bg-cyan-600 text-white font-semibold shadow-sm"
                    : isDark
                    ? "text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60"
                    : "text-slate-600 hover:text-cyan-700 hover:bg-slate-200/70"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase ${
                      isActive
                        ? isDark
                          ? "bg-slate-950/30 text-slate-950"
                          : "bg-cyan-800 text-cyan-100"
                        : isDark
                        ? "bg-slate-800 text-cyan-400 border border-cyan-500/20"
                        : "bg-slate-200 text-cyan-800 border border-cyan-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Quick Controls */}
        <div className="flex items-center gap-2 justify-end">
          {/* Language Toggle (ZH / EN) */}
          <button
            id="toggle-lang-btn"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            title={t.toggleLang}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
              isDark
                ? "bg-slate-900 border-cyan-900/40 text-cyan-300 hover:border-cyan-400 hover:bg-slate-800"
                : "bg-white border-slate-300 text-cyan-800 hover:border-cyan-500 hover:bg-slate-50 shadow-xs"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "中 / EN" : "EN / 中"}</span>
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            id="toggle-theme-btn"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={t.toggleTheme}
            className={`p-2 rounded-lg border transition-all ${
              isDark
                ? "bg-slate-900 border-cyan-900/40 text-amber-300 hover:border-amber-400/60 hover:bg-slate-800"
                : "bg-white border-slate-300 text-slate-700 hover:border-cyan-500 hover:text-cyan-700 shadow-xs"
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings Config Modal Trigger */}
          {onOpenSettings && (
            <button
              id="open-settings-btn"
              onClick={onOpenSettings}
              title={lang === "zh" ? "系统与本地部署配置 (API Key / MCP)" : "System & Local Deployment Settings"}
              className={`p-2 rounded-lg border transition-all ${
                isDark
                  ? "bg-slate-900 border-cyan-900/40 text-cyan-400 hover:border-cyan-400/60 hover:bg-slate-800"
                  : "bg-white border-slate-300 text-slate-700 hover:border-cyan-500 hover:text-cyan-700 shadow-xs"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Voice selector */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
              isDark
                ? "bg-slate-900 border-cyan-900/40"
                : "bg-white border-slate-300 shadow-xs"
            }`}
          >
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
              {lang === "zh" ? "音色:" : "VOICE:"}
            </span>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value as JarvisVoice)}
              className={`bg-transparent outline-none cursor-pointer text-xs ${
                isDark ? "text-cyan-300" : "text-cyan-800 font-semibold"
              }`}
            >
              <option value="Fenrir" className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                Fenrir ({lang === "zh" ? "经典管家" : "Classic"})
              </option>
              <option value="Zephyr" className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                Zephyr ({lang === "zh" ? "现代智能" : "Modern"})
              </option>
              <option value="Puck" className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                Puck ({lang === "zh" ? "清脆灵动" : "Crisp"})
              </option>
              <option value="Charon" className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                Charon ({lang === "zh" ? "沉稳厚重" : "Deep"})
              </option>
              <option value="Kore" className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                Kore ({lang === "zh" ? "亲和温润" : "Smooth"})
              </option>
            </select>
          </div>

          {/* Mute Audio Toggle */}
          <button
            id="toggle-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute Jarvis Voice" : "Mute Jarvis Voice"}
            className={`p-2 rounded-lg border transition-all ${
              isMuted
                ? isDark
                  ? "bg-rose-950/40 border-rose-500/50 text-rose-400"
                  : "bg-rose-50 border-rose-300 text-rose-600"
                : isDark
                ? "bg-slate-900 border-cyan-900/40 text-cyan-400 hover:border-cyan-500/50"
                : "bg-white border-slate-300 text-cyan-700 hover:border-cyan-400"
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Mic Quick Toggle */}
          <button
            id="toggle-mic-btn"
            onClick={toggleMic}
            title={isMicActive ? "Mute Microphone" : "Activate Microphone"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isMicActive
                ? isDark
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)] animate-pulse"
                  : "bg-emerald-100 border-emerald-500 text-emerald-800 animate-pulse font-semibold"
                : isDark
                ? "bg-slate-900 border-cyan-900/40 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40"
                : "bg-white border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-400"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isMicActive ? (lang === "zh" ? "麦克风开" : "MIC LIVE") : (lang === "zh" ? "麦克风关" : "MIC OFF")}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

