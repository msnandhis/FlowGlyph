import type { FlowGlyphEvent, FlowGlyphPartKind } from "@flowglyph/core";

export type RawTextAdapterOptions = {
  id?: string;
  partId?: string;
  role?: "assistant" | "user" | "system";
};

export type ResponseTextAdapterSpeed =
  | "instant"
  | {
      charsPerSecond?: number;
      delayMs?: number;
      chunkSize?: number;
    };

export type ResponseTextAdapterOptions = RawTextAdapterOptions & {
  speed?: ResponseTextAdapterSpeed;
  selectText?: (value: unknown) => string;
};

export async function* rawTextAdapter(
  input: AsyncIterable<string> | Iterable<string> | ReadableStream<Uint8Array>,
  options: RawTextAdapterOptions = {}
): AsyncIterable<FlowGlyphEvent> {
  const messageId = options.id ?? createId("message");
  const partId = options.partId ?? `${messageId}:text`;

  yield {
    type: "message.start",
    messageId,
    role: options.role ?? "assistant"
  };
  yield {
    type: "part.start",
    messageId,
    partId,
    kind: "text"
  };

  for await (const chunk of toTextChunks(input)) {
    if (chunk.length === 0) continue;
    yield {
      type: "part.delta",
      messageId,
      partId,
      delta: chunk
    };
  }

  yield { type: "part.end", messageId, partId };
  yield { type: "message.finish", messageId, status: "complete" };
}

export async function* responseTextAdapter(
  input: string | Promise<string> | Response | Promise<Response> | unknown,
  options: ResponseTextAdapterOptions = {}
): AsyncIterable<FlowGlyphEvent> {
  const text = await resolveResponseText(input, options.selectText);
  const speed = normalizeSpeed(options.speed);
  const chunks = chunkText(text, speed.chunkSize);

  if (speed.delayMs === 0) {
    yield* rawTextAdapter(chunks, options);
    return;
  }

  async function* pacedChunks() {
    for (const chunk of chunks) {
      await delay(speed.delayMs);
      yield chunk;
    }
  }

  yield* rawTextAdapter(pacedChunks(), options);
}

export type FlowGlyphEventsAdapterOptions = {
  provider?: string;
};

export async function* flowGlyphEventsAdapter(
  input:
    | AsyncIterable<FlowGlyphEvent>
    | Iterable<FlowGlyphEvent>
    | ReadableStream<Uint8Array>
    | Response,
  options: FlowGlyphEventsAdapterOptions = {}
): AsyncIterable<FlowGlyphEvent> {
  if (isResponse(input)) {
    yield* flowGlyphEventsAdapter(input.body!, options);
    return;
  }

  if (isReadableStream(input)) {
    let buffer = "";

    for await (const chunk of toTextChunks(input)) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        yield parseFlowGlyphEvent(trimmed, options.provider);
      }
    }

    if (buffer.trim()) {
      yield parseFlowGlyphEvent(buffer.trim(), options.provider);
    }

    return;
  }

  yield* input;
}

export type SSEMessage = {
  event: string;
  data: string;
  id?: string;
  retry?: number;
};

export async function* parseSSE(
  input: Response | ReadableStream<Uint8Array>
): AsyncIterable<SSEMessage> {
  const stream = isResponse(input) ? input.body : input;

  if (!stream) {
    return;
  }

  let event = "message";
  let data: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;
  let buffer = "";

  const flush = function* () {
    if (data.length === 0) return;
    const message: SSEMessage = {
      event,
      data: data.join("\n")
    };
    if (id !== undefined) message.id = id;
    if (retry !== undefined) message.retry = retry;
    yield message;
    event = "message";
    data = [];
    retry = undefined;
  };

  for await (const chunk of toTextChunks(stream)) {
    buffer += chunk;
    const lines = buffer.split(/\r\n|\r|\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line === "") {
        yield* flush();
        continue;
      }

      if (line.startsWith(":")) continue;

      const colon = line.indexOf(":");
      const field = colon >= 0 ? line.slice(0, colon) : line;
      const value =
        colon >= 0
          ? line.slice(colon + 1).replace(/^ /, "")
          : "";

      if (field === "event") event = value;
      if (field === "data") data.push(value);
      if (field === "id") id = value;
      if (field === "retry") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) retry = parsed;
      }
    }
  }

  if (buffer.length > 0) {
    if (buffer.startsWith("data:")) data.push(buffer.slice(5).replace(/^ /, ""));
  }

  yield* flush();
}

export type SSEAdapterOptions = {
  provider?: string;
};

export async function* sseAdapter(
  input: Response | ReadableStream<Uint8Array>,
  options: SSEAdapterOptions = {}
): AsyncIterable<FlowGlyphEvent> {
  for await (const message of parseSSE(input)) {
    if (message.data === "[DONE]") break;

    try {
      yield parseFlowGlyphEvent(message.data, options.provider);
    } catch {
      yield unknownEvent(options.provider, {
        event: message.event,
        data: message.data,
        id: message.id
      });
    }
  }
}

export type VercelUIMessageStreamAdapterOptions = {
  messageId?: string;
};

export async function* vercelUIMessageStreamAdapter(
  input: Response | ReadableStream<Uint8Array>,
  options: VercelUIMessageStreamAdapterOptions = {}
): AsyncIterable<FlowGlyphEvent> {
  const messageId = options.messageId ?? createId("vercel");

  for await (const message of parseSSE(input)) {
    if (message.data === "[DONE]") break;

    let part: { type?: string; id?: string; text?: string; delta?: string; [key: string]: unknown };

    try {
      part = JSON.parse(message.data);
    } catch {
      yield { type: "unknown", provider: "vercel", raw: message };
      continue;
    }

    yield* mapVercelPart(part, messageId);
  }
}

function* mapVercelPart(
  part: { type?: string; id?: string; text?: string; delta?: string; [key: string]: unknown },
  fallbackMessageId: string
): Iterable<FlowGlyphEvent> {
  const messageId =
    typeof part.messageId === "string" ? part.messageId : fallbackMessageId;
  const partId = part.id ?? `${messageId}:${part.type ?? "part"}`;

  if (part.type === "start") {
    yield { type: "message.start", messageId, role: "assistant" };
    return;
  }

  if (part.type === "finish") {
    yield { type: "message.finish", messageId, status: "complete" };
    return;
  }

  if (part.type === "abort") {
    yield { type: "message.finish", messageId, status: "aborted" };
    return;
  }

  if (part.type === "text-start") {
    yield { type: "part.start", messageId, partId, kind: "text" };
    return;
  }

  if (part.type === "text-delta") {
    yield {
      type: "part.delta",
      messageId,
      partId,
      delta: part.delta ?? part.text ?? ""
    };
    return;
  }

  if (part.type === "text-end") {
    yield { type: "part.end", messageId, partId };
    return;
  }

  if (part.type === "error") {
    yield {
      type: "error",
      messageId,
      error: {
        message:
          typeof part.errorText === "string"
            ? part.errorText
            : "The stream returned an error."
      },
      recoverable: true
    };
    return;
  }

  if (typeof part.type === "string") {
    const kind = mapVercelKind(part.type);
    if (kind) {
      yield {
        type: "part.update",
        messageId,
        partId,
        state: "streaming",
        value: part
      };
      return;
    }
  }

  yield { type: "unknown", provider: "vercel", raw: part };
}

function mapVercelKind(type: string): FlowGlyphPartKind | undefined {
  if (type.startsWith("reasoning")) return "reasoning";
  if (type.startsWith("tool-")) return "tool";
  if (type.startsWith("data-")) return "data";
  if (type.startsWith("source-")) return "source";
  if (type === "file") return "file";
  return undefined;
}

async function* toTextChunks(
  input: AsyncIterable<string> | Iterable<string> | ReadableStream<Uint8Array>
): AsyncIterable<string> {
  if (isReadableStream(input)) {
    const decoder = new TextDecoder();
    const reader = input.getReader();

    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        yield decoder.decode(result.value, { stream: true });
      }

      const tail = decoder.decode();
      if (tail) yield tail;
    } finally {
      reader.releaseLock();
    }

    return;
  }

  yield* input;
}

function parseFlowGlyphEvent(raw: string, provider?: string): FlowGlyphEvent {
  const value = JSON.parse(raw) as unknown;

  if (isFlowGlyphEvent(value)) {
    return value;
  }

  return unknownEvent(provider, value);
}

function isFlowGlyphEvent(value: unknown): value is FlowGlyphEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  );
}

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return typeof ReadableStream !== "undefined" && value instanceof ReadableStream;
}

function isResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function resolveResponseText(
  input: string | Promise<string> | Response | Promise<Response> | unknown,
  selectText?: (value: unknown) => string
) {
  const resolved = await input;

  if (typeof resolved === "string") return resolved;

  if (isResponse(resolved)) {
    const contentType = resolved.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const value = (await resolved.json()) as unknown;
      return selectText ? selectText(value) : defaultJsonText(value);
    }

    return resolved.text();
  }

  return selectText ? selectText(resolved) : defaultJsonText(resolved);
}

function defaultJsonText(value: unknown) {
  if (typeof value === "string") return value;

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;

    for (const key of ["text", "content", "message", "answer", "output"]) {
      if (typeof record[key] === "string") return record[key];
    }
  }

  return JSON.stringify(value, null, 2);
}

function normalizeSpeed(speed: ResponseTextAdapterSpeed | undefined) {
  if (speed === "instant") {
    return {
      chunkSize: Number.POSITIVE_INFINITY,
      delayMs: 0
    };
  }

  const chunkSize = Math.max(1, speed?.chunkSize ?? 4);

  if (typeof speed?.delayMs === "number") {
    return {
      chunkSize,
      delayMs: Math.max(0, speed.delayMs)
    };
  }

  if (typeof speed?.charsPerSecond === "number" && speed.charsPerSecond > 0) {
    return {
      chunkSize,
      delayMs: Math.max(0, Math.round((chunkSize / speed.charsPerSecond) * 1000))
    };
  }

  return {
    chunkSize,
    delayMs: 24
  };
}

function chunkText(text: string, chunkSize: number) {
  if (!Number.isFinite(chunkSize) || chunkSize >= text.length) {
    return [text];
  }

  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

function delay(delayMs: number) {
  if (delayMs === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function unknownEvent(provider: string | undefined, raw: unknown): FlowGlyphEvent {
  return provider
    ? {
        type: "unknown",
        provider,
        raw
      }
    : {
        type: "unknown",
        raw
      };
}
