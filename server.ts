import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  getMcpConfig,
  updateMcpConfig,
  testMcpConnection,
  executeVtrReconstruction,
  executeVtrLaneDiagnostics,
  VTR_TOOL_DEFINITIONS,
} from "./server/mcpManager";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

function getAIClient(customKeyOrReq?: string | express.Request | http.IncomingMessage): GoogleGenAI {
  let customKey: string | undefined;
  if (typeof customKeyOrReq === "string") {
    customKey = customKeyOrReq;
  } else if (customKeyOrReq && "headers" in customKeyOrReq) {
    customKey = (customKeyOrReq.headers["x-gemini-api-key"] as string) || undefined;
    if (!customKey && "url" in customKeyOrReq && customKeyOrReq.url) {
      try {
        const parsedUrl = new URL(customKeyOrReq.url, "http://localhost");
        customKey = parsedUrl.searchParams.get("apiKey") || undefined;
      } catch {}
    }
  }

  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in .env or the Settings panel.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    name: "J.A.R.V.I.S.",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// MCP Server Management & Diagnostics Endpoints
app.get("/api/mcp/config", (_req, res) => {
  res.json({
    config: getMcpConfig(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/mcp/config", (req, res) => {
  try {
    const updated = updateMcpConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/mcp/status", async (_req, res) => {
  try {
    const status = await testMcpConnection();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/mcp/tools", (_req, res) => {
  res.json({
    serverKey: "vtr-mcp-server",
    tools: VTR_TOOL_DEFINITIONS,
  });
});

app.post("/api/mcp/call", async (req, res) => {
  try {
    const { toolName, arguments: toolArgs } = req.body;
    if (!toolName) {
      return res.status(400).json({ error: "toolName is required." });
    }

    if (toolName === "vtr_reconstruct_trajectory") {
      const result = executeVtrReconstruction(toolArgs || {});
      return res.json({ success: true, toolName, result });
    }

    if (toolName === "vtr_diagnose_lane_logs") {
      const result = executeVtrLaneDiagnostics(toolArgs?.laneId, toolArgs?.timeRange);
      return res.json({ success: true, toolName, result });
    }

    if (toolName === "vtr_get_passage_evidence") {
      const sample = executeVtrReconstruction({
        plateNumber: toolArgs?.plateNumber || "粤B88888",
        scenarioPreset: "normal",
      });
      return res.json({ success: true, toolName, result: sample.evidence });
    }

    res.status(404).json({ error: `Tool ${toolName} not found on MCP server vtr-mcp-server.` });
  } catch (err: any) {
    console.error("MCP tool call error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Chat with Google Search Grounding and VTR MCP Intelligence
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Check if user is asking about VTR / Vehicle Trajectory Reconstruction / Lane Logs
    const isVtrQuery = /轨迹|车牌|通行|车道|过车|置信度|vtr|ltc|利通虾|etc|道闸|线圈|光栅|抓拍/i.test(message);
    let vtrResult: any = null;

    if (isVtrQuery) {
      // Extract plate if mentioned, otherwise use sample
      const plateMatch = message.match(/([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]?)/i);
      const plate = plateMatch ? plateMatch[1].toUpperCase() : "粤B88888";
      
      let scenario = "normal";
      if (/跟车|贴近|粘连/i.test(message)) scenario = "tailgating";
      else if (/超时|失败|异常|无应答|防拆/i.test(message)) scenario = "rf_timeout";

      vtrResult = executeVtrReconstruction({
        plateNumber: plate,
        scenarioPreset: scenario,
      });
    }

    const ai = getAIClient(req);
    const systemInstruction = `You are J.A.R.V.I.S., the hyper-intelligent, suave, and devoted AI assistant created by Tony Stark.
You speak with refined British elegance, polite wit, and sharp intellect. Address the user with dignified respect (such as "Sir", "Madam", or "Chief").
Keep your spoken style conversational, crisp, and articulate.
You are equipped with Google Search Grounding, and now fully integrated with the VTR (车辆轨迹重构) MCP Server built on LTC (利通虾).
VTR diagnoses lane logs by slicing single vehicle passage events, reconstructing trajectories across coils, laser curtains, ANPR cameras, ETC antennas (RSU), and barrier gates, collecting evidence, and computing confidence scores.
${vtrResult ? `The VTR MCP engine has just reconstructed this vehicle passage:\n${JSON.stringify(vtrResult, null, 2)}\nProvide a refined Jarvis telemetry debrief summarizing the trajectory, millisecond timeline, and confidence score.` : ""}`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const reply = response.text || "At your service, Sir.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c?.web?.uri)
      .map((c: any) => ({
        title: c.web.title || "Web Reference",
        url: c.web.uri,
      }));

    res.json({ reply, sources, vtrResult });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: error.message || "An error occurred while consulting Jarvis core systems.",
    });
  }
});

// Text to speech for verbal feedback
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }

    const ai = getAIClient(req);
    const selectedVoice = voice || "Fenrir"; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text.slice(0, 800) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "Failed to synthesize voice audio." });
    }

    res.json({ audio: base64Audio, sampleRate: 24000 });
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech." });
  }
});

// Create Illustration with Nano Banana Pro (gemini-3-pro-image)
app.post("/api/create-illustration", async (req, res) => {
  try {
    const { prompt, aspectRatio, style } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAIClient(req);
    const enhancedPrompt = style && style !== "none"
      ? `${prompt}, rendered in high aesthetic ${style} style, masterpiece, intricate details, cinematic lighting, 8k concept art`
      : `${prompt}, masterwork illustration, intricate cinematic details, high fidelity visual art`;

    const targetAspectRatio = aspectRatio || "16:9";

    let imageUrl: string | null = null;
    let usedModel = "gemini-3-pro-image (Nano Banana Pro)";

    try {
      // Primary: Nano Banana Pro (gemini-3-pro-image)
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image",
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio as any,
            imageSize: "1K",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (primaryErr: any) {
      console.warn("Primary Nano Banana Pro model had an issue, attempting high-quality fallback:", primaryErr?.message);
      // Fallback to gemini-3.1-flash-image
      usedModel = "gemini-3.1-flash-image";
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio as any,
            imageSize: "1K",
          },
        },
      });

      for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image could be generated by the visual synthesis core." });
    }

    res.json({
      imageUrl,
      model: usedModel,
      prompt: enhancedPrompt,
      aspectRatio: targetAspectRatio,
    });
  } catch (error: any) {
    console.error("Illustration creation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate illustration." });
  }
});

// Reimagine: Take a photo of user and revision it using Nano Banana Pro
app.post("/api/reimagine", async (req, res) => {
  try {
    const { image, prompt, style, aspectRatio } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Input image data is required." });
    }

    // Clean base64 string
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : "image/jpeg";
    const base64Data = match ? match[2] : image;

    const ai = getAIClient(req);
    const styleDescription = style || "Cyberpunk Iron Man Armor Hologram";
    const customPrompt = prompt ? `${prompt}. ` : "";
    const transformationPrompt = `Reimagine and revision this portrait into: ${customPrompt}Style: ${styleDescription}.
Preserve the key identifying facial features, expression, and posture of the person in the photo, while completely re-envisioning them in this magnificent new form. Ultra-detailed concept artwork, cinematic lighting, epic atmospheric mood, highest visual fidelity.`;

    let reimaginedUrl: string | null = null;
    let usedModel = "gemini-3-pro-image (Nano Banana Pro)";

    try {
      // Primary: Nano Banana Pro (gemini-3-pro-image)
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: transformationPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio || "1:1") as any,
            imageSize: "1K",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || "image/png";
          reimaginedUrl = `data:${outMime};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (primaryErr: any) {
      console.warn("Primary Reimagine model issue, falling back to gemini-3.1-flash-image:", primaryErr?.message);
      usedModel = "gemini-3.1-flash-image";
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: transformationPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio || "1:1") as any,
            imageSize: "1K",
          },
        },
      });

      for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || "image/png";
          reimaginedUrl = `data:${outMime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!reimaginedUrl) {
      return res.status(500).json({ error: "Failed to revision portrait." });
    }

    res.json({
      reimaginedUrl,
      model: usedModel,
      style: styleDescription,
      prompt: transformationPrompt,
    });
  } catch (error: any) {
    console.error("Reimagine error:", error);
    res.status(500).json({ error: error.message || "Failed to reimagine portrait." });
  }
});

async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket server for Gemini Live API
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs: WebSocket, req: http.IncomingMessage) => {
    console.log("[Live API] Client connected to Live WebSocket");
    let liveSession: any = null;

    try {
      const ai = getAIClient(req);

      // Tool declarations for Jarvis Live session
      const searchDeclaration: FunctionDeclaration = {
        name: "searchWeb",
        description: "Search Google for real-time information, recent events, weather, stock prices, or facts.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The search query to execute on Google Search.",
            },
          },
          required: ["query"],
        },
      };

      const createIllustrationDeclaration: FunctionDeclaration = {
        name: "createIllustration",
        description: "Create an illustration using Nano Banana Pro.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "Detailed description of the visual scene to illustrate.",
            },
            style: {
              type: Type.STRING,
              description: "Artistic style e.g. Cyberpunk, Blueprint, Renaissance, Sci-Fi, Concept Art.",
            },
          },
          required: ["prompt"],
        },
      };

      const reimagineDeclaration: FunctionDeclaration = {
        name: "reimagineUser",
        description: "Request to take a snapshot with the camera and reimagine the user with Nano Banana Pro.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            stylePrompt: {
              type: Type.STRING,
              description: "How to revision the user (e.g. Iron Man Mark 85 armor, Medieval Sorcerer, Cyberpunk Detective).",
            },
          },
          required: ["stylePrompt"],
        },
      };

      const vtrTrajectoryDeclaration: FunctionDeclaration = {
        name: "vtrReconstructTrajectory",
        description: "Reconstruct vehicle trajectory and slice lane logs from VTR MCP Server (LTC/利通虾). Evaluates sensor timings, license plate ANPR, ETC antenna transaction, barrier opening, and calculates trajectory confidence score.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            plateNumber: {
              type: Type.STRING,
              description: "License plate number e.g. 粤B88888, 京A66666",
            },
            laneId: {
              type: Type.STRING,
              description: "Highway toll lane identifier e.g. G4-E02-ETC",
            },
          },
          required: ["plateNumber"],
        },
      };

      const vtrDiagnoseDeclaration: FunctionDeclaration = {
        name: "vtrDiagnoseLane",
        description: "Diagnose toll lane hardware and communication logs (coils, laser, camera, ETC RSU, barrier) using VTR MCP Server.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            laneId: {
              type: Type.STRING,
              description: "Lane identifier to scan.",
            },
          },
          required: ["laneId"],
        },
      };

      liveSession = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Fenrir" },
            },
          },
          systemInstruction: `You are J.A.R.V.I.S., Tony Stark's legendary British AI assistant.
Speak with refined dignity, wit, and supreme intelligence. Address the user respectfully as "Sir" or "Madam".
Your responses are spoken aloud to the user, so keep them crisp, lively, and natural.
You have tools to:
- search the web ('searchWeb')
- create illustrations ('createIllustration')
- trigger camera reimaginations ('reimagineUser')
- reconstruct vehicle trajectories and diagnose toll lane logs via VTR MCP Server ('vtrReconstructTrajectory', 'vtrDiagnoseLane')
When the user asks you about vehicle trajectory reconstruction, toll logs, license plates, or lane diagnostics, execute the appropriate VTR tool and give a suave tactical report.`,
          tools: [
            {
              functionDeclarations: [
                searchDeclaration,
                createIllustrationDeclaration,
                reimagineDeclaration,
                vtrTrajectoryDeclaration,
                vtrDiagnoseDeclaration,
              ],
            },
          ],
        },
        callbacks: {
          onmessage: async (message: any) => {
            // Audio response parts
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "audio", audio: audioData }));
            }

            // Text / thoughts if present
            const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
            if (textPart && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "text", text: textPart }));
            }

            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            if (message.serverContent?.turnComplete && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "turnComplete" }));
            }

            // Function calling / Tool calls
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls || [];
              const functionResponses: any[] = [];

              for (const call of functionCalls) {
                console.log("[Live API] Tool call:", call.name, call.args);
                clientWs.send(
                  JSON.stringify({
                    type: "toolCall",
                    tool: call.name,
                    args: call.args,
                    id: call.id,
                  })
                );

                if (call.name === "searchWeb") {
                  try {
                    const searchRes = await ai.models.generateContent({
                      model: "gemini-3.8-flash",
                      contents: `Search query: ${call.args.query}. Provide a concise factual summary.`,
                      config: {
                        tools: [{ googleSearch: {} }],
                      },
                    });
                    const summary = searchRes.text || "No results found.";
                    const chunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                    const sources = chunks.filter((c: any) => c?.web?.uri).map((c: any) => ({
                      title: c.web.title || "Source",
                      url: c.web.uri,
                    }));

                    clientWs.send(
                      JSON.stringify({
                        type: "toolResult",
                        tool: "searchWeb",
                        result: { summary, sources },
                        id: call.id,
                      })
                    );

                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: { summary, sourcesCount: sources.length },
                    });
                  } catch (e: any) {
                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: { error: e.message },
                    });
                  }
                } else if (call.name === "createIllustration" || call.name === "reimagineUser") {
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { status: "Action initiated on HUD display", args: call.args },
                  });
                } else if (call.name === "vtrReconstructTrajectory") {
                  try {
                    const vtrData = executeVtrReconstruction(call.args || {});
                    clientWs.send(
                      JSON.stringify({
                        type: "toolResult",
                        tool: "vtrReconstructTrajectory",
                        result: vtrData,
                        id: call.id,
                      })
                    );
                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: {
                        summary: vtrData.diagnosticSummary,
                        confidenceScore: vtrData.confidenceScore,
                        speedKmh: vtrData.speedKmh,
                        stepsCount: vtrData.trajectorySteps.length,
                      },
                    });
                  } catch (e: any) {
                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: { error: e.message },
                    });
                  }
                } else if (call.name === "vtrDiagnoseLane") {
                  try {
                    const diagData = executeVtrLaneDiagnostics(call.args?.laneId);
                    clientWs.send(
                      JSON.stringify({
                        type: "toolResult",
                        tool: "vtrDiagnoseLane",
                        result: diagData,
                        id: call.id,
                      })
                    );
                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: {
                        healthRate: diagData.healthRate,
                        anomaliesCount: diagData.anomalyPassages,
                        recommendations: diagData.recommendedActions,
                      },
                    });
                  } catch (e: any) {
                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: { error: e.message },
                    });
                  }
                }
              }

              if (functionResponses.length > 0 && liveSession) {
                try {
                  await liveSession.sendToolResponse({ functionResponses });
                } catch (e) {
                  console.error("Error sending tool response:", e);
                }
              }
            }
          },
          onerror: (err: any) => {
            console.error("[Live API] Session error:", err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "error", error: err?.message || "Live API error" }));
            }
          },
          onclose: () => {
            console.log("[Live API] Session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "sessionClosed" }));
            }
          },
        },
      });

      clientWs.send(JSON.stringify({ type: "connected", message: "Live connection established with Jarvis core." }));
    } catch (err: any) {
      console.error("[Live API] Initialization error:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: err?.message || "Unable to establish Live API link with Gemini core.",
          })
        );
      }
    }

    clientWs.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!liveSession) return;

        if (msg.type === "audio" && msg.audio) {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (msg.type === "text" && msg.text) {
          liveSession.sendRealtimeInput({
            text: msg.text,
          });
        } else if (msg.type === "video" && msg.video) {
          liveSession.sendRealtimeInput({
            video: {
              data: msg.video,
              mimeType: "image/jpeg",
            },
          });
        }
      } catch (e: any) {
        console.error("Error handling incoming message:", e);
      }
    });

    clientWs.on("close", () => {
      console.log("[Live API] Client disconnected");
      try {
        if (liveSession) {
          liveSession.close();
        }
      } catch (e) {}
    });
  });

  // Integrate Vite for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Jarvis Core Server] Online and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
