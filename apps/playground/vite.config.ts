import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-nano";
const FLOWGLYPH_ROOT = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, FLOWGLYPH_ROOT, "");

  return {
    plugins: [openAIStreamRoute(env), react()]
  };
});

function openAIStreamRoute(env: Record<string, string>): Plugin {
  return {
    name: "flowglyph-openai-stream-route",
    configureServer(server) {
      server.middlewares.use("/api/config", (req, res, next) => {
        if (req.method !== "GET") {
          next();
          return;
        }

        const model =
          env.OPENAI_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
        const hasOpenAIKey = Boolean(
          env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
        );

        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache"
        });
        res.end(JSON.stringify({ hasOpenAIKey, model }));
      });

      server.middlewares.use("/api/openai", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        try {
          const upstream = await createOpenAIResponse(req, env);

          res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no"
          });

          if (!upstream.ok || !upstream.body) {
            const errorText = await upstream.text();
            sendMessageError(
              res,
              `OpenAI request failed (${upstream.status}): ${errorText}`
            );
            res.end();
            return;
          }

          await pipeOpenAIResponsesStream(upstream.body, res);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown OpenAI playground error.";

          if (res.headersSent) {
            sendMessageError(res, message);
            res.end();
            return;
          }

          writeErrorStream(res, message);
        }
      });

      server.middlewares.use("/api/openai/raw", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        try {
          const upstream = await createOpenAIResponse(req, env);

          if (!upstream.ok || !upstream.body) {
            const errorText = await upstream.text();
            writeRawOpenAIError(
              res,
              `OpenAI request failed (${upstream.status}): ${errorText}`
            );
            return;
          }

          res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no"
          });

          await pipeRawOpenAIStream(upstream.body, res);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown OpenAI playground error.";

          writeRawOpenAIError(res, message);
        }
      });
    }
  };
}

async function createOpenAIResponse(
  req: IncomingMessage,
  env: Record<string, string>
) {
  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to FlowGlyph/.env or your shell environment."
    );
  }

  const body = await readJsonBody(req);
  const prompt =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : "Explain why streaming UI matters in AI apps.";
  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : env.OPENAI_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  return fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      stream: true
    })
  });
}

async function pipeRawOpenAIStream(
  body: ReadableStream<Uint8Array>,
  res: ServerResponse
) {
  const reader = body.getReader();

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      res.write(chunk.value);
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}

async function pipeOpenAIResponsesStream(
  body: ReadableStream<Uint8Array>,
  res: ServerResponse
) {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  const messageId = `openai-${Date.now()}`;
  const partId = `${messageId}:text`;
  const statusPartId = `${messageId}:status`;
  let buffer = "";
  let textPartStarted = false;

  sendEvent(res, { type: "message.start", messageId, role: "assistant" });
  sendEvent(res, {
    type: "part.start",
    messageId,
    partId: statusPartId,
    kind: "status",
    name: "OpenAI stream connected"
  });
  sendEvent(res, { type: "part.end", messageId, partId: statusPartId });

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      const blocks = buffer.split(/\n\n/);
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const data = readSSEData(block);
        if (!data || data === "[DONE]") continue;

        const event = JSON.parse(data) as OpenAIStreamEvent;

        if (event.type === "response.output_text.delta") {
          if (!textPartStarted) {
            textPartStarted = true;
            sendEvent(res, {
              type: "part.start",
              messageId,
              partId,
              kind: "text"
            });
          }

          sendEvent(res, {
            type: "part.delta",
            messageId,
            partId,
            delta: event.delta
          });
        }

        if (event.type === "response.output_text.done" && textPartStarted) {
          sendEvent(res, { type: "part.end", messageId, partId });
        }

        if (event.type === "response.completed") {
          sendEvent(res, {
            type: "message.finish",
            messageId,
            status: "complete"
          });
        }

        if (event.type === "response.failed" || event.type === "error") {
          sendEvent(res, {
            type: "error",
            messageId,
            error: {
              message: getOpenAIErrorMessage(event)
            },
            recoverable: true
          });
        }
      }
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}

type OpenAIStreamEvent =
  | { type: "response.output_text.delta"; delta: string }
  | { type: "response.output_text.done"; text?: string }
  | { type: "response.completed" }
  | { type: "response.failed"; response?: { error?: { message?: string } } }
  | { type: "error"; message?: string; error?: { message?: string } }
  | { type: string; [key: string]: unknown };

function getOpenAIErrorMessage(event: OpenAIStreamEvent) {
  if ("message" in event && typeof event.message === "string") {
    return event.message;
  }

  if (
    "error" in event &&
    event.error &&
    typeof event.error === "object" &&
    "message" in event.error &&
    typeof event.error.message === "string"
  ) {
    return event.error.message;
  }

  if (
    "response" in event &&
    event.response?.error?.message &&
    typeof event.response.error.message === "string"
  ) {
    return event.response.error.message;
  }

  return "OpenAI stream failed.";
}

function readSSEData(block: string) {
  const lines = block.split(/\r?\n/);
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  return data.trim();
}

async function readJsonBody(req: IncomingMessage) {
  let raw = "";

  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw) return {};

  return JSON.parse(raw) as { message?: unknown; model?: unknown };
}

function writeErrorStream(res: ServerResponse, message: string) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  sendMessageError(res, message);
  res.end();
}

function writeRawOpenAIError(res: ServerResponse, message: string) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.write(`data: ${JSON.stringify({ type: "error", error: { message } })}\n\n`);
  res.end();
}

function sendMessageError(res: ServerResponse, message: string) {
  const messageId = `openai-error-${Date.now()}`;

  sendEvent(res, { type: "message.start", messageId, role: "assistant" });
  sendEvent(res, {
    type: "error",
    messageId,
    error: {
      message
    },
    recoverable: true
  });
  sendEvent(res, {
    type: "message.finish",
    messageId,
    status: "error",
    reason: message
  });
}

function sendEvent(res: ServerResponse, event: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
