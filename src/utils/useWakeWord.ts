import { useState, useEffect, useRef, useCallback } from "react";

export interface WakeWordResult {
  keyword: "利通虾" | "Jarvis";
  fullTranscript: string;
  commandText?: string;
  timestamp: string;
}

interface UseWakeWordOptions {
  enabled: boolean;
  onWakeWord: (result: WakeWordResult) => void;
  lang?: string;
}

export function useWakeWord({ enabled, onWakeWord, lang = "zh" }: UseWakeWordOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastDetected, setLastDetected] = useState<WakeWordResult | null>(null);
  const [wakeTriggerCount, setWakeTriggerCount] = useState(0);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
    }
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      const lower = transcript.toLowerCase();
      let matchedKeyword: "利通虾" | "Jarvis" | null = null;
      let cleanedCommand = "";

      // Match "利通虾" or variations
      const ltcMatch = transcript.match(/(?:利通虾|立通虾|利通|litongxia)/i);
      if (ltcMatch && ltcMatch.index !== undefined) {
        matchedKeyword = "利通虾";
        cleanedCommand = transcript.slice(ltcMatch.index + ltcMatch[0].length).replace(/^[,，!！.。\s]+/, "");
      } else {
        // Match "Jarvis" or "贾维斯"
        const jarvisMatch = transcript.match(/(?:jarvis|贾维斯|j\.a\.r\.v\.i\.s)/i);
        if (jarvisMatch && jarvisMatch.index !== undefined) {
          matchedKeyword = "Jarvis";
          cleanedCommand = transcript.slice(jarvisMatch.index + jarvisMatch[0].length).replace(/^[,，!！.。\s]+/, "");
        }
      }

      if (matchedKeyword) {
        const result: WakeWordResult = {
          keyword: matchedKeyword,
          fullTranscript: transcript,
          commandText: cleanedCommand.trim() || undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };

        setLastDetected(result);
        setWakeTriggerCount((c) => c + 1);
        onWakeWord(result);
      }
    },
    [onWakeWord]
  );

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || !enabled) {
      if (recognitionRef.current) {
        shouldRestartRef.current = false;
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
        setIsListening(false);
      }
      return;
    }

    shouldRestartRef.current = true;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === "en" ? "en-US" : "zh-CN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript?.trim();
          if (transcript) {
            handleTranscript(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        // In iframe or without mic permission, not-allowed / no-speech might fire
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      };

      recognition.onend = () => {
        if (shouldRestartRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition initialization:", err);
      setIsListening(false);
    }

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, [enabled, lang, handleTranscript]);

  // Simulation method for testing in environments without audio mic permissions
  const triggerSimulation = useCallback(
    (keyword: "利通虾" | "Jarvis", command?: string) => {
      const result: WakeWordResult = {
        keyword,
        fullTranscript: command ? `${keyword}, ${command}` : keyword,
        commandText: command,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      setLastDetected(result);
      setWakeTriggerCount((c) => c + 1);
      onWakeWord(result);
    },
    [onWakeWord]
  );

  return {
    isSupported,
    isListening,
    lastDetected,
    wakeTriggerCount,
    triggerSimulation,
  };
}
