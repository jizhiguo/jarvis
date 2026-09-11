// proxy-setup.ts
// 必须在 @google/genai / ws 加载之前执行
import { createRequire } from "module";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ProxyAgent, setGlobalDispatcher } from "undici";

const PROXY_URL =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  "http://127.0.0.1:10808";

// ---------- 1) 让所有 undici fetch 走代理（覆盖 Gemini REST / SDK 内部 fetch） ----------
setGlobalDispatcher(new ProxyAgent(PROXY_URL));

// ---------- 2) 给 ws 打补丁，让所有 wss:// 连接走代理（覆盖 Gemini Live API） ----------
const require = createRequire(import.meta.url);
const wsModule = require("ws");
const proxyAgent = new HttpsProxyAgent(PROXY_URL);
const OriginalWebSocket = wsModule.WebSocket;

class PatchedWebSocket extends OriginalWebSocket {
  constructor(address: any, protocols?: any, options?: any) {
    if (typeof address === "string" && address.startsWith("wss://")) {
      if (Array.isArray(protocols)) {
        options = { ...(options || {}), agent: proxyAgent };
      } else if (protocols && typeof protocols === "object") {
        options = { ...protocols, agent: proxyAgent };
        protocols = undefined;
      } else {
        options = { ...(options || {}), agent: proxyAgent };
      }
    }
    super(address, protocols, options);
  }
}

wsModule.WebSocket = PatchedWebSocket;

console.log(`[Proxy] Using ${PROXY_URL}`);