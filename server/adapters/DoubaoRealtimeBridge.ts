import { WebSocket } from "ws";
import zlib from "zlib";
import crypto from "crypto";
import { RealtimeProviderConfig } from "../../src/types.js";
import { resolveRealtimeApiKey, resolveProviderHeaders } from "../realtimeManager.js";
import { providerRegistry } from "./ProviderRegistry.js";

/**
 * ByteDance / Volcano Engine OpenSpeech Binary Frame Specification:
 * - Header: 4 bytes
 *   Byte 0: 0x11 (Version 1, Header length = 1 * 4 bytes)
 *   Byte 1: Message Type
 *     0x10: Full client request
 *     0x20: Audio-only client request
 *     0x22: Audio-only last client request
 *     0x90: Full server response (JSON)
 *     0xb0: Audio-only server response (PCM/MP3)
 *     0xf0: Error response
 *   Byte 2: Serialization (high 4 bits) & Compression (low 4 bits)
 *     0x10: JSON, no compression
 *     0x00: Raw bytes, no compression
 *     0x11: JSON, gzip
 *   Byte 3: 0x00 (Reserved)
 * - Payload length: 4 bytes (UInt32BE)
 * - Payload: payload length bytes
 */

export function buildFullClientRequest(payload: Record<string, any>): Buffer {
  const jsonBuf = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(8);
  header[0] = 0x11; // Version 1, 4 bytes
  header[1] = 0x10; // Full client request
  header[2] = 0x10; // JSON, no compression
  header[3] = 0x00; // Reserved
  header.writeUInt32BE(jsonBuf.length, 4);
  return Buffer.concat([header, jsonBuf]);
}

export function buildAudioRequest(pcmBuffer: Buffer, isLast = false): Buffer {
  const header = Buffer.alloc(8);
  header[0] = 0x11;
  header[1] = isLast ? 0x22 : 0x20; // Audio only request
  header[2] = 0x00; // Raw bytes
  header[3] = 0x00;
  header.writeUInt32BE(pcmBuffer.length, 4);
  return Buffer.concat([header, pcmBuffer]);
}

export function parseBinaryFrame(buf: Buffer): {
  msgType: number;
  payloadType: "json" | "audio" | "error" | "unknown";
  payload: any;
} | null {
  if (buf.length < 8) return null;
  const headerSize = (buf[0] & 0x0f) * 4;
  const msgType = buf[1] >> 4;
  const serialization = buf[2] >> 4;
  const compression = buf[2] & 0x0f;
  const payloadSize = buf.readUInt32BE(headerSize);

  let payloadBuf = buf.subarray(headerSize + 4, headerSize + 4 + payloadSize);
  if (compression === 1) {
    try {
      payloadBuf = zlib.gunzipSync(payloadBuf);
    } catch {
      // ignore gzip decompress error
    }
  }

  if (msgType === 0x09 || serialization === 0x01) {
    try {
      return { msgType, payloadType: "json", payload: JSON.parse(payloadBuf.toString("utf8")) };
    } catch {
      return { msgType, payloadType: "json", payload: payloadBuf.toString("utf8") };
    }
  } else if (msgType === 0x0b || serialization === 0x00) {
    return { msgType, payloadType: "audio", payload: payloadBuf };
  } else if (msgType === 0x0f) {
    try {
      return { msgType, payloadType: "error", payload: JSON.parse(payloadBuf.toString("utf8")) };
    } catch {
      return { msgType, payloadType: "error", payload: payloadBuf.toString("utf8") };
    }
  }
  return { msgType, payloadType: "unknown", payload: payloadBuf };
}

export async function bridgeDoubaoRealtime(
  clientWs: WebSocket,
  provider: RealtimeProviderConfig
): Promise<void> {
  const apiKey = resolveRealtimeApiKey(provider) || process.env.VOLCENGINE_API_KEY;
  const headers = resolveProviderHeaders(provider);
  const appKey = headers["X-Api-App-Key"] || process.env.VOLCENGINE_APP_KEY;
  const resourceId = headers["X-Api-Resource-Id"] || "volc.speech.dialog";
  const endpoint = provider.endpoint || "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";

  let upstream: WebSocket | null = null;
  let isUpstreamConnected = false;

  // Attempt binary WebSocket connection if credentials exist
  if (apiKey && appKey) {
    try {
      const connectHeaders: Record<string, string> = {
        ...headers,
        "X-Api-Resource-Id": resourceId,
        "X-Api-App-Key": appKey,
        "X-Api-Access-Key": apiKey,
        Authorization: `Bearer ${apiKey}`,
        "X-Api-Connect-Id": crypto.randomUUID(),
      };

      upstream = new WebSocket(endpoint, { headers: connectHeaders });

      upstream.on("open", () => {
        isUpstreamConnected = true;
        console.log("[Doubao Bridge] Successfully connected to Volcano Engine OpenSpeech binary WebSocket");

        const initPayload = {
          user: {
            uid: "jarvis_user_" + Math.random().toString(36).substring(2, 8),
          },
          audio: {
            format: "pcm",
            rate: 16000,
            bits: 16,
            channel: 1,
          },
          dialog: {
            bot_id: provider.model || "O2.0",
            voice_type: provider.voice || "zh_male_xiaotian_jupiter_bigtts",
            action: "start",
          },
        };
        upstream?.send(buildFullClientRequest(initPayload));

        clientWs.send(
          JSON.stringify({
            type: "connected",
            provider: provider.id,
            message: "火山引擎 豆包 (Doubao Seed) 双工语音通道建立成功。",
          })
        );
      });

      upstream.on("message", (data: any) => {
        try {
          if (Buffer.isBuffer(data)) {
            const parsed = parseBinaryFrame(data);
            if (!parsed) return;

            if (parsed.payloadType === "audio" && Buffer.isBuffer(parsed.payload)) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  audio: parsed.payload.toString("base64"),
                })
              );
            } else if (parsed.payloadType === "json") {
              const text =
                parsed.payload?.text ||
                parsed.payload?.payload_msg?.text ||
                parsed.payload?.result?.text ||
                "";
              if (text) {
                clientWs.send(JSON.stringify({ type: "text", text }));
              }
              if (parsed.payload?.is_last || parsed.payload?.event === "turn_complete") {
                clientWs.send(JSON.stringify({ type: "turnComplete" }));
              }
            } else if (parsed.payloadType === "error") {
              console.warn("[Doubao Bridge] Upstream error frame received:", parsed.payload);
              clientWs.send(
                JSON.stringify({
                  type: "error",
                  error:
                    typeof parsed.payload === "string"
                      ? parsed.payload
                      : JSON.stringify(parsed.payload),
                })
              );
            }
          }
        } catch (err: any) {
          console.error("[Doubao Bridge] Error parsing upstream message:", err);
        }
      });

      upstream.on("error", (err: any) => {
        console.warn("[Doubao Bridge] Upstream WebSocket notice:", err.message);
        isUpstreamConnected = false;
      });

      upstream.on("close", (code, reason) => {
        console.log(`[Doubao Bridge] Upstream closed code=${code} reason=${reason}`);
        isUpstreamConnected = false;
      });
    } catch (connErr: any) {
      console.warn("[Doubao Bridge] Failed to establish upstream:", connErr.message);
    }
  }

  // Always inform the client that the bridge is active
  clientWs.send(
    JSON.stringify({
      type: "connected",
      provider: provider.id,
      message: "火山引擎 豆包 (Doubao Seed) 交互通道已连接。",
    })
  );

  if (!apiKey || !appKey) {
    clientWs.send(
      JSON.stringify({
        type: "text",
        text: "您好！当前已切换至【火山引擎 豆包】。检测到尚未配置双工语音凭据（VOLCENGINE_API_KEY / VOLCENGINE_APP_KEY），当前已为您无缝激活【火山方舟大模型文本推理通道】。您可以直接在输入框中向豆包发送文本消息；如需使用实时语音，可在右上角设置中补充配置。",
      })
    );
    clientWs.send(JSON.stringify({ type: "turnComplete" }));
  }

  // Get adapter instance for text reasoning fallback / complement
  const doubaoAdapter =
    providerRegistry.getAdapter(provider.id) || providerRegistry.getAdapter("doubao-realtime");

  clientWs.on("message", async (raw: any) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "audio" && msg.audio) {
        if (isUpstreamConnected && upstream?.readyState === WebSocket.OPEN) {
          const pcmBuf = Buffer.from(msg.audio, "base64");
          upstream.send(buildAudioRequest(pcmBuf));
        } else {
          // Inform client without crash
          clientWs.send(
            JSON.stringify({
              type: "text",
              text: "【语音提示】当前火山引擎双工语音服务未连通，建议在输入框中使用文本与豆包对话，或在右上角设置中配置语音密钥。",
            })
          );
          clientWs.send(JSON.stringify({ type: "turnComplete" }));
        }
      } else if (msg.type === "text" && msg.text) {
        // Direct to Doubao Ark text LLM reasoning
        try {
          const result = await doubaoAdapter.generateText({
            messages: [{ role: "user", content: msg.text }],
            systemInstruction:
              provider.systemInstruction ||
              "你是 J.A.R.V.I.S.，基于字节跳动火山引擎豆包大模型的全功能智能助手。",
            temperature: provider.temperature,
          });
          clientWs.send(JSON.stringify({ type: "text", text: result.reply }));
          clientWs.send(JSON.stringify({ type: "turnComplete" }));
        } catch (textErr: any) {
          console.error("[Doubao Bridge] Text generation error:", textErr);
          clientWs.send(
            JSON.stringify({
              type: "error",
              error: `豆包模型回复异常: ${textErr.message || textErr}`,
            })
          );
        }
      }
    } catch (e: any) {
      console.error("[Doubao Bridge] Client message error:", e);
    }
  });

  clientWs.on("close", () => {
    if (upstream && upstream.readyState === WebSocket.OPEN) {
      upstream.close();
    }
  });
}
