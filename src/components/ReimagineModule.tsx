import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  Download,
  Sliders,
  Shield,
  Layers,
  Loader2,
  Check,
  Maximize2,
  X,
  FlipHorizontal,
} from "lucide-react";
import { ReimagineItem, AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";

interface ReimagineModuleProps {
  reimaginedItems: ReimagineItem[];
  onAddReimagineItem: (item: ReimagineItem) => void;
  onSpeakText: (text: string) => void;
  lang?: AppLanguage;
  theme?: AppTheme;
}

export const ReimagineModule: React.FC<ReimagineModuleProps> = ({
  reimaginedItems,
  onAddReimagineItem,
  onSpeakText,
  lang = "zh",
  theme = "dark",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(
    lang === "zh" ? "钢铁侠 Mark 85 纳米战甲" : "Iron Man Mark 85 Nanotech Armor"
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"side-by-side" | "reimagined" | "original">("side-by-side");
  const [activeModalItem, setActiveModalItem] = useState<ReimagineItem | null>(null);

  const t = getT(lang);
  const isDark = theme === "dark";

  const stylePresets =
    lang === "zh"
      ? [
          {
            name: "钢铁侠 Mark 85 纳米战甲",
            desc: "身披托尼·斯塔克标志性红金纳米战甲，胸口方舟反应堆闪耀全息光芒",
            icon: "🛡️",
          },
          {
            name: "赛博朋克 2077 街头雇佣兵",
            desc: "发光义眼机械改造，全息霓虹纹身，夜之城雨夜全息霓虹背景",
            icon: "⚡",
          },
          {
            name: "星际无畏舰队指挥官",
            desc: "身着未来深空战舰制服，伫立于星云全息星图环绕的舰桥中枢",
            icon: "🚀",
          },
          {
            name: "文艺复兴皇家贵族",
            desc: "古典油画笔触，皇室丝绒华服，金线刺绣与尊贵剧场明暗光影",
            icon: "👑",
          },
          {
            name: "高阶仿生机械机体",
            desc: "抛光碳纤维与镀铬钛金机械躯干，精密微观流光电路脉络",
            icon: "🤖",
          },
          {
            name: "动漫王牌机甲驾驶员",
            desc: "身着未来神经同步战斗服，置身于超重型机甲全息座舱之中",
            icon: "⚔️",
          },
        ]
      : [
          {
            name: "Iron Man Mark 85 Nanotech Armor",
            desc: "Encased in Tony Stark's iconic red & gold nanotech armor with glowing arc reactor optics",
            icon: "🛡️",
          },
          {
            name: "Cyberpunk 2077 Street Mercenary",
            desc: "Cybernetic glowing ocular implants, holographic tattoos, neon Night City rain backdrop",
            icon: "⚡",
          },
          {
            name: "Interstellar Starship Commander",
            desc: "Sleek deep-space flagship uniform on the command bridge overlooking a nebula",
            icon: "🚀",
          },
          {
            name: "Renaissance Royal Aristocrat",
            desc: "Classical oil painting portrait in royal velvet, gold brocade, and regal lighting",
            icon: "👑",
          },
          {
            name: "Futuristic Cybernetic Android",
            desc: "Polished carbon fiber and chrome chassis with intricate luminous circuit lines",
            icon: "🤖",
          },
          {
            name: "Anime Mecha Ace Pilot",
            desc: "High-tech flight plugsuit inside the holographic cockpit of a giant battle mech",
            icon: "⚔️",
          },
        ];

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Camera permission denied or camera device unavailable. You may upload a photo below.");
      setIsCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Capture snapshot from video
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw frame (mirroring for natural selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCapturedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Execute Reimagine with Nano Banana Pro
  const handleReimagine = async () => {
    if (!capturedImage || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/reimagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          style: selectedStyle,
          prompt: customPrompt,
          aspectRatio: "1:1",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reimagine failed");

      const newItem: ReimagineItem = {
        id: Date.now().toString(),
        originalImage: capturedImage,
        reimaginedImage: data.reimaginedUrl,
        prompt: customPrompt || selectedStyle,
        style: selectedStyle,
        model: data.model || "gemini-3-pro-image (Nano Banana Pro)",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      onAddReimagineItem(newItem);
      onSpeakText(
        lang === "zh"
          ? `先生，重塑协议执行完毕。已通过 Nano Banana Pro 将您的肖像重构为【${selectedStyle}】。`
          : `Reimagination protocol complete, Sir. Your likeness has been revisioned into the ${selectedStyle} protocol using Nano Banana Pro.`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || (lang === "zh" ? "重构肖像失败" : "Failed to revision portrait."));
    } finally {
      setLoading(false);
    }
  };

  const latestItem = reimaginedItems[0] || null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Module Banner */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDark
            ? "bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-emerald-950/30 border-emerald-500/30 text-slate-100"
            : "bg-white/95 border-emerald-300 text-slate-800 shadow-sm"
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-5 h-5 text-emerald-500" />
            <h2
              className={`text-lg font-bold font-mono tracking-wider ${
                isDark ? "text-emerald-300" : "text-emerald-800"
              }`}
            >
              {t.reimagineTitle}
            </h2>
          </div>
          <p className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t.reimagineSubtitle}
          </p>
        </div>

        <div
          className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${
            isDark
              ? "bg-slate-900 border-emerald-500/30 text-emerald-400"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{lang === "zh" ? "光学面部感知与神经渲染" : "FACIAL RECOGNITION & SYNTHESIS"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder & Capture */}
        <div
          className={`lg:col-span-6 flex flex-col p-6 rounded-2xl border backdrop-blur-md space-y-4 transition-colors ${
            isDark
              ? "bg-slate-900/80 border-cyan-900/40 text-slate-100"
              : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-cyan-900/40" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-500" />
              <span
                className={`text-xs font-mono font-bold ${
                  isDark ? "text-cyan-300" : "text-cyan-800"
                }`}
              >
                {lang === "zh" ? "JARVIS 光学取景视界" : "JARVIS HUD OPTICAL VIEWFINDER"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`text-[11px] font-mono px-2.5 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                  isDark
                    ? "bg-slate-800 border-cyan-800/40 text-cyan-300 hover:text-white"
                    : "bg-slate-100 border-slate-300 text-slate-700 hover:text-cyan-800 hover:border-cyan-400"
                }`}
                title="Upload custom portrait"
              >
                <Upload className="w-3 h-3" />
                <span>{lang === "zh" ? "本地上传照片" : "UPLOAD PHOTO"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Video or Snapshot Container with HUD overlay */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-cyan-500/40 flex items-center justify-center">
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedImage}
                  alt="Captured snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
                  {lang === "zh" ? "肖像已就绪，可开始重塑" : "PHOTO READY FOR REIMAGINE"}
                </div>
                <button
                  onClick={() => setCapturedImage(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 border border-rose-500/40 text-rose-400 hover:text-white cursor-pointer"
                  title="Retake photo"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />

                {/* Jarvis Futuristic Holographic HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Targeting Reticle Corners */}
                  <div className="w-48 h-48 border-2 border-cyan-400/40 rounded-3xl relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

                    {/* Central Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border border-cyan-400/60 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Scanning beam animation */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 animate-bounce" />

                  <div className="absolute bottom-3 left-3 text-[10px] font-mono text-cyan-400/80 bg-slate-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                    TARGET LOCKED • SENSORS ALIGNED
                  </div>
                </div>
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <p className="text-xs text-rose-400 font-mono">{cameraError}</p>
          )}

          {/* Action capture buttons */}
          <div className="flex items-center gap-3 pt-1">
            {!capturedImage ? (
              <button
                id="take-photo-btn"
                onClick={takeSnapshot}
                disabled={!isCameraActive}
                className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{t.capturePhoto}</span>
              </button>
            ) : (
              <button
                onClick={() => setCapturedImage(null)}
                className={`flex-1 py-3 rounded-xl font-mono text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.retakePhoto}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Style Presets & Reimagine Action */}
        <div
          className={`lg:col-span-6 flex flex-col p-6 rounded-2xl border backdrop-blur-md space-y-4 transition-colors ${
            isDark
              ? "bg-slate-900/80 border-cyan-900/40 text-slate-100"
              : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
          }`}
        >
          <div
            className={`border-b pb-3 ${
              isDark ? "border-cyan-900/40" : "border-slate-200"
            }`}
          >
            <span
              className={`text-xs font-mono font-bold flex items-center gap-2 ${
                isDark ? "text-cyan-300" : "text-cyan-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>{lang === "zh" ? "形象重塑风格库" : "REVISIONING PROTOCOL SELECTION"}</span>
            </span>
            <p className={`text-[11px] font-mono mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {lang === "zh" ? "选择标志性重塑画风，亦可输入定制化细节" : "Select an iconic transformation style or add custom instructions."}
            </p>
          </div>

          {/* Style Presets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto no-scrollbar">
            {stylePresets.map((sp) => {
              const isSelected = selectedStyle === sp.name;
              return (
                <button
                  key={sp.name}
                  type="button"
                  onClick={() => setSelectedStyle(sp.name)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-emerald-500/15 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                        : "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-xs"
                      : isDark
                      ? "bg-slate-950/80 border-cyan-950 text-slate-400 hover:text-slate-200 hover:border-cyan-800"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{sp.icon}</span>
                    <p className="text-xs font-mono font-bold leading-tight">{sp.name}</p>
                  </div>
                  <p className={`text-[10px] mt-1 line-clamp-2 leading-relaxed ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                    {sp.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom instruction prompt */}
          <div className="space-y-1.5 pt-1">
            <label
              className={`text-xs font-mono ${
                isDark ? "text-slate-300" : "text-slate-700 font-semibold"
              }`}
            >
              {lang === "zh" ? "个性化画面细节要求 (可选):" : "CUSTOM VISION OVERRIDE (OPTIONAL):"}
            </label>
            <input
              id="reimagine-custom-prompt"
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                lang === "zh"
                  ? "例如：佩戴发光金色战甲拳套、宇宙闪电背景、好莱坞电影级光影..."
                  : "e.g. Glowing golden gauntlets, cosmic lightning background, cinematic lighting..."
              }
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-sans border transition-colors ${
                isDark
                  ? "bg-slate-950/80 border-cyan-900/50 text-slate-200 placeholder-slate-500 focus:border-emerald-400"
                  : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500"
              }`}
            />
          </div>

          {/* Execute Reimagine Button */}
          <button
            id="reimagine-execute-btn"
            onClick={handleReimagine}
            disabled={loading || !capturedImage}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.generating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t.reimagineButton}</span>
              </>
            )}
          </button>

          {!capturedImage && (
            <p className="text-[11px] text-amber-500 font-mono text-center">
              {lang === "zh"
                ? "* 请先在左侧拍摄一张肖像照片或上传本地照片"
                : "* Please capture a photo or upload an image on the left first."}
            </p>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono">
              {lang === "zh" ? "系统诊断异常" : "Diagnostic Error"}: {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Latest Reimagined Showcase */}
      {latestItem && (
        <div
          className={`p-6 rounded-2xl border backdrop-blur-md shadow-2xl space-y-4 transition-colors ${
            isDark
              ? "bg-slate-900/90 border-emerald-500/40 text-slate-100"
              : "bg-white/95 border-emerald-300 text-slate-800 shadow-sm"
          }`}
        >
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${
              isDark ? "border-cyan-900/40" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <div>
                <h3
                  className={`text-sm font-mono font-bold ${
                    isDark ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
                  {lang === "zh" ? "最新重构成果" : "LATEST REVISION"}: {latestItem.style}
                </h3>
                <p className={`text-[11px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Synthesized via gemini-3-pro-image (Nano Banana Pro)
                </p>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div
              className={`flex items-center gap-1.5 p-1 rounded-lg border text-xs font-mono ${
                isDark ? "bg-slate-950 border-cyan-900/40" : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => setViewMode("side-by-side")}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  viewMode === "side-by-side"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "zh" ? "双图对比" : "SIDE BY SIDE"}
              </button>
              <button
                onClick={() => setViewMode("reimagined")}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  viewMode === "reimagined"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "zh" ? "重构图像" : "REVISIONED"}
              </button>
              <button
                onClick={() => setViewMode("original")}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  viewMode === "original"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "zh" ? "原图" : "ORIGINAL PHOTO"}
              </button>
            </div>
          </div>

          {/* Comparison View */}
          <div className="relative">
            {viewMode === "side-by-side" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500 font-semibold"
                    }`}
                  >
                    {lang === "zh" ? "摄像头原始采集:" : "ORIGINAL CAMERA CAPTURE:"}
                  </span>
                  <div
                    className={`rounded-xl overflow-hidden border aspect-square ${
                      isDark ? "border-cyan-900/50 bg-slate-950" : "border-slate-200 bg-slate-100"
                    }`}
                  >
                    <img
                      src={latestItem.originalImage}
                      alt="Original capture"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                      isDark ? "text-emerald-400" : "text-emerald-700"
                    }`}
                  >
                    {lang === "zh" ? "NANO BANANA PRO 重塑成果:" : "REVISIONED BY NANO BANANA PRO:"}
                  </span>
                  <div
                    className={`rounded-xl overflow-hidden border aspect-square relative group shadow-lg ${
                      isDark
                        ? "border-emerald-500/50 bg-slate-950 shadow-emerald-500/20"
                        : "border-emerald-400 bg-slate-100 shadow-sm"
                    }`}
                  >
                    <img
                      src={latestItem.reimaginedImage}
                      alt="Reimagined vision"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setActiveModalItem(latestItem)}
                        className="p-1.5 rounded-lg bg-slate-950/80 text-emerald-300 hover:text-white border border-emerald-500/40 cursor-pointer"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={latestItem.reimaginedImage}
                        download={`jarvis-reimagined-${latestItem.id}.png`}
                        className="p-1.5 rounded-lg bg-slate-950/80 text-emerald-300 hover:text-white border border-emerald-500/40 cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : viewMode === "reimagined" ? (
              <div
                className={`max-w-2xl mx-auto rounded-xl overflow-hidden border aspect-square shadow-2xl ${
                  isDark ? "border-emerald-500/60 bg-slate-950" : "border-emerald-300 bg-slate-100 shadow-sm"
                }`}
              >
                <img
                  src={latestItem.reimaginedImage}
                  alt="Reimagined vision"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`max-w-2xl mx-auto rounded-xl overflow-hidden border aspect-square ${
                  isDark ? "border-cyan-900/60 bg-slate-950" : "border-slate-200 bg-slate-100"
                }`}
              >
                <img
                  src={latestItem.originalImage}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <a
              href={latestItem.reimaginedImage}
              download={`jarvis-reimagined-${latestItem.id}.png`}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === "zh" ? "下载重构作品" : "DOWNLOAD REVISIONED ARTWORK"}</span>
            </a>
          </div>
        </div>
      )}

      {/* History of Reimagined Portraits */}
      {reimaginedItems.length > 1 && (
        <div className="space-y-3">
          <h3
            className={`text-xs font-mono font-bold uppercase tracking-wider ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {lang === "zh" ? "历史重塑记录" : "PREVIOUS REIMAGININGS"} ({reimaginedItems.length - 1})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {reimaginedItems.slice(1).map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalItem(item)}
                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                  isDark
                    ? "border-cyan-900/40 hover:border-emerald-400 bg-slate-900"
                    : "border-slate-200 hover:border-emerald-500 bg-white shadow-sm"
                }`}
              >
                <div className="aspect-square">
                  <img
                    src={item.reimaginedImage}
                    alt={item.style}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div
                  className={`p-2.5 text-[11px] font-mono ${
                    isDark ? "bg-slate-950/90" : "bg-slate-50"
                  }`}
                >
                  <p
                    className={`truncate font-semibold ${
                      isDark ? "text-emerald-300" : "text-emerald-800"
                    }`}
                  >
                    {item.style}
                  </p>
                  <p className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {item.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal View */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div
            className={`relative max-w-4xl w-full border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
              isDark ? "bg-slate-900 border-emerald-500/50" : "bg-white border-slate-300"
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isDark ? "border-cyan-900/50" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-500" />
                <span
                  className={`text-xs font-mono font-bold ${
                    isDark ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
                  REVISION DETAIL • {activeModalItem.style}
                </span>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
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
                src={activeModalItem.reimaginedImage}
                alt={activeModalItem.style}
                className="max-h-[68vh] object-contain rounded-xl border border-emerald-500/40"
              />
            </div>

            <div
              className={`p-4 border-t flex items-center justify-between ${
                isDark
                  ? "border-cyan-900/50 bg-slate-900 text-slate-300"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <p className="text-xs font-mono">
                Model: <span className="text-emerald-500 font-semibold">{activeModalItem.model}</span>
              </p>
              <a
                href={activeModalItem.reimaginedImage}
                download={`jarvis-reimagined-${activeModalItem.id}.png`}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === "zh" ? "保存图像" : "SAVE IMAGE"}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
