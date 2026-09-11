import React, { useState } from "react";
import { Search, Globe, ExternalLink, Volume2, Sparkles, Loader2, BookOpen } from "lucide-react";
import { SearchSource, AppLanguage, AppTheme } from "../types";
import { getT } from "../i18n";

interface SearchModuleProps {
  onSpeakText: (text: string) => void;
  chatProviderId?: string;
  lang?: AppLanguage;
  theme?: AppTheme;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  answer: string;
  sources: SearchSource[];
  timestamp: string;
}

export const SearchModule: React.FC<SearchModuleProps> = ({
  onSpeakText,
  chatProviderId = "gemini-live",
  lang = "zh",
  theme = "dark",
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    query: string;
    answer: string;
    sources: SearchSource[];
  } | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const t = getT(lang);
  const isDark = theme === "dark";

  const sampleQueries =
    lang === "zh"
      ? [
          "韦伯太空望远镜最新重大科学发现",
          "NASA 阿尔忒弥斯载人登月计划最新进展",
          "受控核聚变商业化与清洁能源前沿突破",
          "室温超导体与量子计算最新科研成果",
          "全球主要气候反常现象与大气环流分析",
        ]
      : [
          "Latest milestones from James Webb Space Telescope",
          "Current status of NASA Artemis lunar program",
          "Commercial nuclear fusion and clean energy developments",
          "Superconductor and quantum computing breakthroughs",
          "Global weather patterns and atmospheric anomalies today",
        ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chat-provider": chatProviderId },
        body: JSON.stringify({
          provider: chatProviderId,
          message:
            lang === "zh"
              ? `请在谷歌搜索中检索以下事实并进行条理化中文总结：${searchQuery}`
              : `Search Google and summarize with latest factual details: ${searchQuery}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      const result = {
        query: searchQuery,
        answer: data.reply,
        sources: data.sources || [],
      };

      setCurrentResult(result);
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          ...result,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ]);

      // Automatically announce brief intro or speak
      onSpeakText(data.reply.slice(0, 300));
    } catch (err: any) {
      console.error(err);
      setCurrentResult({
        query: searchQuery,
        answer: `I apologize, Sir. My connection to the Google Search grounding matrix encountered an interruption: ${err.message}`,
        sources: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header card */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDark
            ? "bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-cyan-950/40 border-cyan-900/40 text-slate-100"
            : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-cyan-500" />
            <h2
              className={`text-lg font-bold font-mono tracking-wider ${
                isDark ? "text-cyan-300" : "text-cyan-800"
              }`}
            >
              {t.searchTitle}
            </h2>
          </div>
          <p className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t.searchSubtitle}
          </p>
        </div>

        <div
          className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${
            isDark
              ? "bg-slate-900 border-cyan-800/40 text-cyan-400"
              : "bg-cyan-50 border-cyan-200 text-cyan-800 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{lang === "zh" ? "已启用谷歌检索实时信源" : "REAL-TIME WEB SOURCES ENABLED"}</span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div
        className={`p-4 rounded-2xl border backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/80 border-cyan-900/40"
            : "bg-white/95 border-slate-200 shadow-sm"
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
            <input
              id="grounded-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none font-sans border transition-colors ${
                isDark
                  ? "bg-slate-950/80 border-cyan-900/50 text-slate-200 placeholder-slate-500 focus:border-cyan-400"
                  : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
              }`}
            />
          </div>

          <button
            id="execute-search-btn"
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono tracking-wider transition-all flex items-center gap-2 shadow-lg shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.searching}</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>{t.searchButton}</span>
              </>
            )}
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <span
            className={`text-[10px] font-mono uppercase shrink-0 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {lang === "zh" ? "探索建议:" : "DISCOVERY PROMPTS:"}
          </span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                isDark
                  ? "bg-slate-950 border-cyan-900/40 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50"
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:text-cyan-800 hover:border-cyan-400 shadow-2xs"
              }`}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Active Search Result */}
      {currentResult && (
        <div
          className={`p-6 rounded-2xl border backdrop-blur-md shadow-2xl relative overflow-hidden transition-colors ${
            isDark
              ? "bg-slate-900/90 border-cyan-500/40 text-slate-100"
              : "bg-white/95 border-cyan-300 text-slate-800 shadow-sm"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-3 mb-4 ${
              isDark ? "border-cyan-900/40" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span
                className={`text-xs font-mono font-semibold ${
                  isDark ? "text-cyan-300" : "text-cyan-800"
                }`}
              >
                {lang === "zh" ? "检索词" : "QUERY"}: "{currentResult.query}"
              </span>
            </div>
            <button
              onClick={() => onSpeakText(currentResult.answer)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                isDark
                  ? "bg-slate-800 hover:bg-cyan-950 border-cyan-800/40 text-cyan-300"
                  : "bg-slate-100 hover:bg-cyan-100 border-slate-300 text-cyan-800 font-semibold"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{lang === "zh" ? "语音朗读" : "SPEAK ANSWER"}</span>
            </button>
          </div>

          <div
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {currentResult.answer}
          </div>

          {/* Web Grounding Citations */}
          {currentResult.sources.length > 0 && (
            <div
              className={`mt-6 pt-4 border-t ${
                isDark ? "border-cyan-900/40" : "border-slate-200"
              }`}
            >
              <h4
                className={`text-xs font-mono font-semibold mb-3 flex items-center gap-1.5 ${
                  isDark ? "text-cyan-400" : "text-cyan-800"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t.searchSourcesTitle}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {currentResult.sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-xl border flex flex-col justify-between group transition-all ${
                      isDark
                        ? "bg-slate-950/80 border-cyan-900/50 hover:border-cyan-400"
                        : "bg-slate-50 border-slate-200 hover:border-cyan-500 shadow-2xs"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium line-clamp-2 ${
                        isDark
                          ? "text-slate-200 group-hover:text-cyan-300"
                          : "text-slate-800 group-hover:text-cyan-700"
                      }`}
                    >
                      {s.title || (lang === "zh" ? "权威网页来源" : "Web Resource")}
                    </span>
                    <div
                      className={`mt-2 flex items-center justify-between text-[10px] font-mono ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <span className="truncate max-w-[150px]">
                        {(() => {
                          try {
                            return new URL(s.url).hostname;
                          } catch {
                            return s.url;
                          }
                        })()}
                      </span>
                      <ExternalLink className="w-3 h-3 text-cyan-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search History */}
      {history.length > 1 && (
        <div
          className={`p-5 rounded-2xl border transition-colors ${
            isDark
              ? "bg-slate-900/60 border-cyan-900/30"
              : "bg-white/95 border-slate-200 shadow-sm"
          }`}
        >
          <h3
            className={`text-xs font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
            <span>{lang === "zh" ? "近期检索记录" : "RECENT GROUNDED INQUIRIES"}</span>
          </h3>
          <div className="space-y-2">
            {history.slice(1).map((h) => (
              <div
                key={h.id}
                onClick={() => setCurrentResult(h)}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  isDark
                    ? "bg-slate-950/60 border-cyan-950 hover:border-cyan-800"
                    : "bg-slate-50 border-slate-200 hover:border-cyan-400 shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-cyan-500" />
                  <span
                    className={`text-xs font-medium ${
                      isDark ? "text-slate-300" : "text-slate-800"
                    }`}
                  >
                    {h.query}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {h.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
