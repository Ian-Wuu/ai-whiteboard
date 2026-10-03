import Fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { loadConfig } from "./config";
import { searchReferenceImages, type ImageCandidate } from "./image-search";
import { SYSTEM_PROMPT, TOOLS } from "./prompt";
import { validateToolArguments } from "../src/schemas";

const config = loadConfig();
const app = Fastify({ logger: { level: "info", redact: ["req.headers.authorization"] } });
await app.register(websocket);

app.get("/api/health", async () => ({ ok: true, app: "ai-blackboard", model: config.model }));

app.get("/api/realtime", { websocket: true }, (browser) => {
  const upstreamUrl = `wss://${config.workspaceId}.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(config.model)}`;
  const qwen = new WebSocket(upstreamUrl, {
    headers: { Authorization: `Bearer ${config.apiKey}`, "User-Agent": "ai-blackboard-local/0.1" },
  });
  const upstreamTimeout = setTimeout(() => {
    if (ready) return;
    app.log.warn("Qwen realtime connection timed out");
    if (browser.readyState === WebSocket.OPEN) {
      browser.send(JSON.stringify({ type: "relay.error", message: "千问实时连接超时，请稍后重试。" }));
    }
    qwen.terminate();
  }, 15_000);

  let ready = false;
  const queued: string[] = [];
  const imageCandidates = new Map<string, ImageCandidate & { expiresAt: number }>();
  const connectionAbort = new AbortController();
  const activity = (message: string) => {
    if (browser.readyState === WebSocket.OPEN) browser.send(JSON.stringify({ type: "relay.activity", message }));
  };
  const sendQwen = (payload: unknown) => {
    if (connectionAbort.signal.aborted || qwen.readyState === WebSocket.CLOSED || qwen.readyState === WebSocket.CLOSING) return;
    const message = JSON.stringify(payload);
    if (ready && qwen.readyState === WebSocket.OPEN) qwen.send(message);
    else queued.push(message);
  };
  const finishTool = (callId: string, output: unknown) => {
    sendQwen({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) },
    });
    sendQwen({ type: "response.create", response: { modalities: ["audio", "text"] } });
  };

  qwen.on("open", () => {
    clearTimeout(upstreamTimeout);
    ready = true;
    sendQwen({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        voice: "longanqian",
        instructions: SYSTEM_PROMPT,
        input_audio_format: "pcm",
        output_audio_format: "pcm",
        max_history_turns: 20,
        tools: TOOLS,
        turn_detection: { type: "smart_turn" },
      },
    });
    while (queued.length) qwen.send(queued.shift()!);
    browser.send(JSON.stringify({ type: "relay.connected", model: config.model }));
  });

  qwen.on("message", async (raw) => {
    const message = raw.toString();
    let messageForBrowser = message;
    try {
      const event = JSON.parse(message) as Record<string, unknown>;
      if (event.type === "response.function_call_arguments.done") {
        const name = String(event.name ?? "");
        const callId = String(event.call_id ?? "");
        const args = JSON.parse(String(event.arguments ?? "{}"));
        const validated = validateToolArguments(name, args);
        if (!validated.success) {
          finishTool(callId, { ok: false, error: validated.error });
          return;
        }

        if (name === "search_reference_images") {
          activity("正在搜索并验证参考图片…");
          const input = validated.data as { query: string; maxResults: number };
          try {
            const results = await searchReferenceImages({
              apiKey: config.apiKey,
              workspaceId: config.workspaceId,
              model: config.imageSearchModel,
              query: input.query,
              maxResults: input.maxResults,
              signal: connectionAbort.signal,
            });
            const now = Date.now();
            for (const [token, candidate] of imageCandidates) {
              if (candidate.expiresAt <= now) imageCandidates.delete(token);
            }
            const candidates = results.map((candidate) => {
              const assetToken = crypto.randomUUID().replaceAll("-", "");
              imageCandidates.set(assetToken, { ...candidate, expiresAt: now + 10 * 60_000 });
              while (imageCandidates.size > 30) imageCandidates.delete(imageCandidates.keys().next().value!);
              return { assetToken, title: candidate.title, sourceDomain: candidate.sourceDomain };
            });
            finishTool(callId, candidates.length
              ? { ok: true, candidates }
              : { ok: false, error: "no_safe_images" });
          } catch (error) {
            app.log.warn({ err: error }, "Reference image search failed");
            finishTool(callId, { ok: false, error: "image_search_failed" });
          } finally {
            activity("");
          }
          return;
        }

        if (name === "apply_board_ops") {
          const input = structuredClone(validated.data) as {
            ops: Array<{ op: string; element?: Record<string, unknown> }>;
          };
          for (const operation of input.ops) {
            if (operation.op !== "create" || operation.element?.type !== "reference_image") continue;
            const token = String(operation.element.assetToken ?? "");
            const candidate = imageCandidates.get(token);
            if (!candidate || candidate.expiresAt <= Date.now()) {
              imageCandidates.delete(token);
              finishTool(callId, { ok: false, error: "invalid_or_expired_image_candidate" });
              return;
            }
            // Keep the candidate until expiry so a revision conflict can be retried.
            operation.element = {
              ...operation.element,
              assetToken: undefined,
              imageUrl: candidate.imageUrl,
              sourceUrl: candidate.sourceUrl,
              sourceDomain: candidate.sourceDomain,
              text: candidate.title,
            };
          }
          messageForBrowser = JSON.stringify({ ...event, arguments: JSON.stringify(input) });
        }
      }
    } catch {
      app.log.warn("Ignored malformed Qwen event");
      return;
    }
    if (browser.readyState === WebSocket.OPEN) browser.send(messageForBrowser);
  });
  qwen.on("error", (error) => {
    app.log.error({ err: error }, "Qwen realtime connection failed");
    if (browser.readyState === WebSocket.OPEN) {
      browser.send(JSON.stringify({ type: "relay.error", message: "连接千问失败，请检查余额、Key 与网络。" }));
    }
  });
  qwen.on("close", (code) => {
    clearTimeout(upstreamTimeout);
    if (browser.readyState === WebSocket.OPEN) browser.send(JSON.stringify({ type: "relay.closed", code }));
  });

  browser.on("message", (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (event.type === "client.audio") {
        sendQwen({ type: "input_audio_buffer.append", audio: event.audio });
      } else if (event.type === "client.context") {
        sendQwen({
          type: "conversation.item.create",
          item: {
            id: `board_${crypto.randomUUID().replaceAll("-", "")}`,
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: event.text }],
          },
        });
        if (event.respond) sendQwen({ type: "response.create", response: { modalities: ["audio", "text"] } });
      } else if (event.type === "client.tool_result") {
        sendQwen({
          type: "conversation.item.create",
          item: { type: "function_call_output", call_id: event.callId, output: JSON.stringify(event.output) },
        });
        sendQwen({ type: "response.create", response: { modalities: ["audio", "text"] } });
      } else if (event.type === "client.cancel") {
        sendQwen({ type: "response.cancel" });
      }
    } catch {
      browser.send(JSON.stringify({ type: "relay.error", message: "本地消息格式无效。" }));
    }
  });

  browser.on("close", () => {
    connectionAbort.abort();
    clearTimeout(upstreamTimeout);
    qwen.close();
  });
});

await app.listen({ host: "127.0.0.1", port: config.port });
