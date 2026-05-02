import { describe, expect, it } from "vitest";
import { openAIResponsesAdapter } from "../src/index";

describe("@flowglyph/adapters-openai", () => {
  it("maps OpenAI text deltas to FlowGlyph events", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encode('data: {"type":"response.output_text.delta","delta":"Hi"}\n\n')
        );
        controller.enqueue(
          encode('data: {"type":"response.output_text.done"}\n\n')
        );
        controller.enqueue(encode('data: {"type":"response.completed"}\n\n'));
        controller.close();
      }
    });
    const events = [];

    for await (const event of openAIResponsesAdapter(stream, { messageId: "m1" })) {
      events.push(event);
    }

    expect(events).toMatchObject([
      { type: "message.start", messageId: "m1" },
      { type: "part.start", messageId: "m1", partId: "m1:text" },
      { type: "part.delta", messageId: "m1", delta: "Hi" },
      { type: "part.end", messageId: "m1", partId: "m1:text" },
      { type: "message.finish", messageId: "m1", status: "complete" }
    ]);
  });
});

function encode(value: string) {
  return new TextEncoder().encode(value);
}
