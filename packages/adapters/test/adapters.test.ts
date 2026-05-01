import { describe, expect, it } from "vitest";
import { rawTextAdapter, sseAdapter } from "../src/index";

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
});
