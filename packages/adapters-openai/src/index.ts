import { parseSSE } from "@flowglyph/adapters";
import type { FlowGlyphEvent } from "@flowglyph/core";

export type OpenAIResponsesAdapterOptions = {
  messageId?: string;
  partId?: string;
};

export async function* openAIResponsesAdapter(
  input: Response | ReadableStream<Uint8Array>,
  options: OpenAIResponsesAdapterOptions = {}
): AsyncIterable<FlowGlyphEvent> {
  const messageId = options.messageId ?? createId("openai");
  const textPartId = options.partId ?? `${messageId}:text`;
  let messageStarted = false;
  let textStarted = false;
  let textFinished = false;

  const ensureTextPart = function* (): Iterable<FlowGlyphEvent> {
    if (!messageStarted) {
      messageStarted = true;
      yield {
        type: "message.start",
        messageId,
        role: "assistant"
      };
    }

    if (!textStarted) {
      textStarted = true;
      yield {
        type: "part.start",
        messageId,
        partId: textPartId,
        kind: "text"
      };
    }
  };

  for await (const sse of parseSSE(input)) {
    if (sse.data === "[DONE]") break;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(sse.data) as Record<string, unknown>;
    } catch {
      yield {
        type: "unknown",
        provider: "openai",
        raw: sse
      };
      continue;
    }

    const type = typeof payload.type === "string" ? payload.type : sse.event;

    if (type === "response.output_text.delta") {
      for (const event of ensureTextPart()) yield event;
      yield {
        type: "part.delta",
        messageId,
        partId: textPartId,
        delta: String(payload.delta ?? "")
      };
      continue;
    }

    if (type === "response.output_text.done") {
      if (textStarted && !textFinished) {
        yield {
          type: "part.end",
          messageId,
          partId: textPartId
        };
        textFinished = true;
      }
      continue;
    }

    if (type === "response.completed") {
      if (!messageStarted) {
        yield {
          type: "message.start",
          messageId,
          role: "assistant"
        };
      }
      if (textStarted && !textFinished) {
        yield {
          type: "part.end",
          messageId,
          partId: textPartId
        };
        textFinished = true;
      }
      yield {
        type: "message.finish",
        messageId,
        status: "complete",
        usage: payload.response
      };
      continue;
    }

    if (type === "response.failed" || type === "error") {
      const message = readErrorMessage(payload) ?? "OpenAI stream failed.";
      yield {
        type: "error",
        messageId,
        error: {
          message
        }
      };
      yield {
        type: "message.finish",
        messageId,
        status: "error",
        reason: message
      };
      continue;
    }

    yield {
      type: "unknown",
      provider: "openai",
      raw: payload
    };
  }
}

function readErrorMessage(payload: Record<string, unknown>) {
  const error = payload.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
