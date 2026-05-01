import { describe, expect, it } from "vitest";
import { rawTextAdapter, responseTextAdapter, sseAdapter } from "../src/index";

describe("@flowglyph/adapters", () => {
  it("converts text chunks to FlowGlyph events", async () => {
    const events = [];

    for await (const event of rawTextAdapter(["Hi", " there"], { id: "m1" })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      "message.start",
      "part.start",
      "part.delta",
      "part.delta",
      "part.end",
      "message.finish"
    ]);
  });

  it("parses SSE FlowGlyph events", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"message.start","messageId":"m1"}\n\n'
          )
        );
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    const events = [];

    for await (const event of sseAdapter(stream)) {
      events.push(event);
    }

    expect(events).toEqual([{ type: "message.start", messageId: "m1" }]);
  });

  it("turns a normal text response into paced deltas", async () => {
    const events = [];

    for await (const event of responseTextAdapter("Hello world", {
      id: "m1",
      speed: {
        chunkSize: 5,
        delayMs: 0
      }
    })) {
      events.push(event);
    }

    expect(events).toMatchObject([
      { type: "message.start", messageId: "m1" },
      { type: "part.start", messageId: "m1", partId: "m1:text" },
      { type: "part.delta", delta: "Hello" },
      { type: "part.delta", delta: " worl" },
      { type: "part.delta", delta: "d" },
      { type: "part.end", messageId: "m1", partId: "m1:text" },
      { type: "message.finish", messageId: "m1", status: "complete" }
    ]);
  });

  it("extracts common JSON response fields", async () => {
    const response = new Response(JSON.stringify({ answer: "JSON answer" }), {
      headers: {
        "content-type": "application/json"
      }
    });
    const events = [];

    for await (const event of responseTextAdapter(response, {
      id: "m1",
      speed: "instant"
    })) {
      events.push(event);
    }

    expect(events).toContainEqual({
      type: "part.delta",
      messageId: "m1",
      partId: "m1:text",
      delta: "JSON answer"
    });
  });
});
