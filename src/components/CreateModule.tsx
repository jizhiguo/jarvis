import React, { useState } from "react";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Maximize2,
  X,
  Loader2,
  Layers,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";
import { IllustrationItem, AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";

interface CreateModuleProps {
  illustrations: IllustrationItem[];
  onAddIllustration: (item: IllustrationItem) => void;
  onSpeakText: (text: string) => void;
  lang?: AppLanguage;
  theme?: AppTheme;
}

export const CreateModule: React.FC<CreateModuleProps> = ({
  illustrations,
  onAddIllustration,
  onSpeakText,
  lang = "zh",
  theme = "dark",
}) => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Cinematic Sci-Fi Concept");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState<IllustrationItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const t = getT(lang);
  const isDark = theme === "dark";

  const stylePresets =
    lang === "zh"
      ? [
          { name: "电影科幻概念", desc: "宏大电影级打光与空间体素氛围" },
          { name: "斯塔克全息蓝图", desc: "青色发光线框与 HUD 几何拓扑" },
          { name: "赛博朋克霓虹", desc: "高饱和夜景、雨夜倒影与光栅" },
          { name: "漫威英雄典藏", desc: "动态英雄对决构图与动势分镜" },
          { name: "文艺复兴油画", desc: "明暗对比法与古典美术馆质感" },
          { name: "吉卜力奇幻风", desc: "清澈水彩手绘与明丽温暖光影" },
          { name: "8K 超逼真渲染", desc: "极尽真实的材质细节与物理光追" },
          { name: "复古未来波浪", desc: "80年代合成波网格与落日地平线" },
        ]
      : [
          { name: "Cinematic Sci-Fi Concept", desc: "Epic cinematic lighting, volumetric atmosphere" },
          { name: "Holographic Stark Blueprint", desc: "Cyan glowing wireframe HUD diagrams" },
          { name: "Cyberpunk Neon Matrix", desc: "Vibrant high-contrast neon nightscape" },
          { name: "Marvel Superhero Masterpiece", desc: "Dynamic superhero action splash page" },
          { name: "Renaissance Oil Painting", desc: "Chiaroscuro, classical museum art" },
          { name: "Studio Anime Fantasy", desc: "Lush watercolor backgrounds and vivid lighting" },
          { name: "Hyperrealistic 8K Render", desc: "Octane 3D render with lifelike textures" },
          { name: "Retro Futuristic Synthwave", desc: "1980s retro-futuristic grid sunset" },
        ];

  const aspectRatios = [
    { label: "16:9", value: "16:9" },
    { label: "1:1", value: "1:1" },
    { label: "9:16", value: "9:16" },
    { label: "4:3", value: "4:3" },
    { label: "3:4", value: "3:4" },
  ];

  const sampleIllustrationPrompts =
    lang === "zh"
      ? [
          "黄昏海滨悬崖上的托尼·斯塔克未来科技工坊，悬浮着量子全息反应堆核心",
          "穿梭在霓虹云层之上的纳米反重力飞艇与天空空港站台",
          "在冰雪极光山脉间翱翔的重型钛合金机械猎鹰",
          "身披发光振金纳米战甲的赛博武士守卫数字樱花神社",
        ]
      : [
          "A quantum holographic arc reactor hovering inside Tony Stark's oceanfront workshop at twilight",
          "Futuristic skyport with nanotech personal airships cruising above neon clouds",
          "Mechanical cybernetic falcon soaring through an aurora borealis over icy mountains",
          "A cyber-samurai warrior in glowing titanium armor guarding a cherry blossom digital shrine",
        ];

  const handleGenerate = async (targetPrompt?: string) => {
    const finalPrompt = targetPrompt || prompt;
    if (!finalPrompt.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/create-illustration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          style: selectedStyle,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const newItem: IllustrationItem = {
        id: Date.now().toString(),
        prompt: finalPrompt,
        imageUrl: data.imageUrl,
        aspectRatio,
        style: selectedStyle,
        model: data.model || "gemini-3-pro-image (Nano Banana Pro)",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      onAddIllustration(newItem);
      onSpeakText(
        lang === "zh"
          ? "先生，根据您的指令，Nano Banana Pro 已完成高保真插画合成。"
          : "Illustration synthesis complete, Sir. I have rendered your vision with Nano Banana Pro."
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || (lang === "zh" ? "插画生成失败" : "Failed to synthesize illustration."));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Module Banner */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDark
            ? "bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-amber-950/30 border-amber-500/30 text-slate-100"
            : "bg-white/95 border-amber-300 text-slate-800 shadow-sm"
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2
              className={`text-lg font-bold font-mono tracking-wider ${
                isDark ? "text-amber-300" : "text-amber-800"
              }`}
            >
              {t.createTitle}
            </h2>
          </div>
          <p className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t.createSubtitle}
          </p>
        </div>

        <div
          className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${
            isDark
              ? "bg-slate-900 border-amber-500/30 text-amber-400"
              : "bg-amber-50 border-amber-200 text-amber-800 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>MODEL: GEMINI-3-PRO-IMAGE (NANO BANANA PRO)</span>
        </div>
      </div>

      {/* Creation Studio Card */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-md space-y-5 transition-colors ${
          isDark
            ? "bg-slate-900/80 border-cyan-900/40 text-slate-100"
            : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        {/* Prompt Input */}
        <div className="space-y-2">
          <label
            className={`text-xs font-mono flex items-center justify-between ${
              isDark ? "text-cyan-300" : "text-cyan-800 font-semibold"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-cyan-500" />
              <span>{lang === "zh" ? "插画创意提示词" : "ILLUSTRATION PROMPT"}</span>
            </span>
            <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              NANO BANANA PRO SYNTHESIZER
            </span>
          </label>
          <textarea
            id="illustration-prompt-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.createPlaceholder}
            className={`w-full rounded-xl p-3.5 text-sm focus:outline-none font-sans resize-none border transition-colors ${
              isDark
                ? "bg-slate-950/90 border-cyan-900/50 text-slate-200 placeholder-slate-500 focus:border-cyan-400"
                : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
            }`}
          />
        </div>

        {/* Quick Sample Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <span
            className={`text-[10px] font-mono uppercase shrink-0 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {t.presetPrompts}:
          </span>
          {sampleIllustrationPrompts.map((sp, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(sp)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                isDark
                  ? "bg-slate-950 border-cyan-900/40 text-slate-300 hover:text-amber-300 hover:border-amber-500/40"
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:text-amber-800 hover:border-amber-400 shadow-2xs"
              }`}
            >
              {sp.slice(0, 36)}...
            </button>
          ))}
        </div>

        {/* Style Preset Selector */}
        <div className="space-y-2">
          <label
            className={`text-xs font-mono flex items-center gap-1.5 ${
              isDark ? "text-slate-300" : "text-slate-700 font-semibold"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
            <span>{lang === "zh" ? "选择画风美学预设" : "SELECT ARTISTIC AESTHETIC"}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stylePresets.map((st) => {
              const isSelected = selectedStyle === st.name;
              return (
                <button
                  key={st.name}
                  type="button"
                  onClick={() => setSelectedStyle(st.name)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-amber-500/15 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : "bg-amber-50 border-amber-400 text-amber-900 font-semibold shadow-xs"
                      : isDark
                      ? "bg-slate-950/80 border-cyan-950 text-slate-400 hover:text-slate-200 hover:border-cyan-800"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-mono font-semibold">{st.name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{st.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio & Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span
              className={`text-[11px] font-mono mr-1 ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {lang === "zh" ? "画幅比例:" : "RATIO:"}
            </span>
            {aspectRatios.map((ar) => (
              <button
                key={ar.value}
                type="button"
                onClick={() => setAspectRatio(ar.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                  aspectRatio === ar.value
                    ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-xs"
                    : isDark
                    ? "bg-slate-950 border-cyan-950 text-slate-400 hover:text-cyan-300 hover:border-cyan-800"
                    : "bg-slate-100 border-slate-300 text-slate-700 hover:text-cyan-800 hover:border-cyan-400 shadow-2xs"
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>

          <button
            id="generate-illustration-btn"
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-mono font-bold text-xs tracking-wider disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.generating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t.generateButton}</span>
              </>
            )}
          </button>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono">
            {lang === "zh" ? "系统诊断异常" : "Jarvis Diagnostics"}: {errorMessage}
          </div>
        )}
      </div>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className={`text-sm font-mono font-bold flex items-center gap-2 ${
              isDark ? "text-cyan-300" : "text-cyan-800"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-cyan-500" />
            <span>
              {t.historyGallery} ({illustrations.length})
            </span>
          </h3>
        </div>

        {illustrations.length === 0 ? (
          <div
            className={`p-12 rounded-2xl border text-center transition-colors ${
              isDark
                ? "bg-slate-900/40 border-cyan-950 text-slate-500"
                : "bg-white/80 border-slate-200 text-slate-500 shadow-sm"
            }`}
          >
            <Sparkles className="w-8 h-8 mx-auto text-cyan-500/40 mb-2" />
            <p className="text-xs font-mono">
              {lang === "zh"
                ? "暂无已生成的插画作品。您可以向 Jarvis 发出语音指令或在上方输入创意提示词。"
                : "No illustrations generated yet. Ask Jarvis or enter a prompt above."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {illustrations.map((item) => (
              <div
                key={item.id}
                className={`group relative rounded-2xl border overflow-hidden shadow-xl transition-all ${
                  isDark
                    ? "bg-slate-900/90 border-cyan-900/40 hover:border-cyan-400/60"
                    : "bg-white border-slate-200 hover:border-cyan-400 shadow-sm"
                }`}
              >
                <div className="relative aspect-video overflow-hidden bg-slate-950">
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent opacity-60" />

                  {/* Quick Action Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setActiveImageModal(item)}
                      className="p-1.5 rounded-lg bg-slate-950/80 text-cyan-300 hover:text-white border border-cyan-500/40 backdrop-blur-sm cursor-pointer"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={item.imageUrl}
                      download={`jarvis-illustration-${item.id}.png`}
                      className="p-1.5 rounded-lg bg-slate-950/80 text-cyan-300 hover:text-white border border-cyan-500/40 backdrop-blur-sm cursor-pointer"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <p
                    className={`text-xs line-clamp-2 font-medium ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {item.prompt}
                  </p>
                  <div
                    className={`flex items-center justify-between text-[10px] font-mono pt-1 border-t ${
                      isDark ? "border-cyan-900/30 text-slate-400" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    <span className="text-amber-500 font-semibold">{item.style}</span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div
            className={`relative max-w-5xl w-full border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
              isDark ? "bg-slate-900 border-cyan-500/50" : "bg-white border-slate-300"
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isDark ? "border-cyan-900/50" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span
                  className={`text-xs font-mono font-bold ${
                    isDark ? "text-cyan-300" : "text-cyan-800"
                  }`}
                >
                  ILLUSTRATION INSPECTION • NANO BANANA PRO
                </span>
              </div>
              <button
                onClick={() => setActiveImageModal(null)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark
                    ? "bg-slate-800 text-slate-400 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
              <img
                src={activeImageModal.imageUrl}
                alt={activeImageModal.prompt}
                className="max-h-[65vh] object-contain rounded-xl border border-cyan-900/40"
                referrerPolicy="no-referrer"
              />
            </div>

            <div
              className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDark
                  ? "border-cyan-900/50 bg-slate-900 text-slate-300"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="text-xs max-w-2xl">
                <p
                  className={`font-semibold mb-0.5 ${
                    isDark ? "text-cyan-300" : "text-cyan-800"
                  }`}
                >
                  {lang === "zh" ? "提示词:" : "Prompt:"}
                </p>
                <p className="text-xs line-clamp-2">{activeImageModal.prompt}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyPrompt(activeImageModal.prompt)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? "bg-slate-800 border-cyan-900 text-cyan-300 hover:text-white"
                      : "bg-slate-200 border-slate-300 text-slate-800 hover:bg-slate-300"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>
                    {copied
                      ? lang === "zh"
                        ? "已复制"
                        : "COPIED"
                      : lang === "zh"
                      ? "复制提示词"
                      : "COPY PROMPT"}
                  </span>
                </button>
                <a
                  href={activeImageModal.imageUrl}
                  download={`jarvis-nano-banana-${activeImageModal.id}.png`}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === "zh" ? "下载高清作品" : "DOWNLOAD ARTWORK"}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
