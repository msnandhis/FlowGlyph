import { describe, expect, it } from "vitest";
import { createFlowGlyph, type FlowGlyphEvent } from "../src/index";

describe("createFlowGlyph", () => {
  it("builds text state from part lifecycle events", async () => {
    const flow = createFlowGlyph({ now: () => 1 });
    const events: FlowGlyphEvent[] = [
      { type: "message.start", messageId: "m1", role: "assistant" },
      {
        type: "part.start",
        messageId: "m1",
        partId: "p1",
        kind: "text"
      },
      { type: "part.delta", messageId: "m1", partId: "p1", delta: "Hello" },
      { type: "part.delta", messageId: "m1", partId: "p1", delta: " world" },
      { type: "part.end", messageId: "m1", partId: "p1" },
      { type: "message.finish", messageId: "m1", status: "complete" }
    ];

    await flow.consume(events);

    expect(flow.getState().status).toBe("complete");
    expect(flow.getState().messages[0]?.parts[0]?.text).toBe("Hello world");
  });

  it("supports plugins and cleanup", () => {
    const flow = createFlowGlyph();
    let seen = 0;
    let cleaned = false;
    const disable = flow.use({
      name: "counter",
      setup(api) {
        const off = api.on("event", () => {
          seen += 1;
        });

        return () => {
          cleaned = true;
          off();
        };
      }
    });

    flow.dispatch({ type: "message.start", messageId: "m1" });
    disable();
    flow.dispatch({ type: "message.finish", messageId: "m1", status: "complete" });

    expect(seen).toBe(1);
    expect(cleaned).toBe(true);
  });

  it("marks active streams aborted on cancel", async () => {
    const flow = createFlowGlyph();

    async function* events() {
      yield { type: "message.start", messageId: "m1" } satisfies FlowGlyphEvent;
      flow.cancel();
      yield {
        type: "part.start",
        messageId: "m1",
        partId: "p1",
        kind: "text"
      } satisfies FlowGlyphEvent;
    }

    await flow.consume(events());

    expect(flow.getState().status).toBe("aborted");
    expect(flow.getState().messages[0]?.status).toBe("aborted");
  });

  it("calls the retry hook", async () => {
    let retries = 0;
    const flow = createFlowGlyph({
      onRetry() {
        retries += 1;
      }
    });

    await flow.retry();

    expect(retries).toBe(1);
  });

  it("can keep only the latest message in single mode", async () => {
    const flow = createFlowGlyph({ mode: "single" });

    flow.dispatch({ type: "message.start", messageId: "m1" });
    flow.dispatch({ type: "message.finish", messageId: "m1", status: "complete" });
    flow.dispatch({ type: "message.start", messageId: "m2" });

    expect(flow.getState().messages).toHaveLength(1);
    expect(flow.getState().messages[0]?.id).toBe("m2");
  });

  it("skips disabled plugins", () => {
    const flow = createFlowGlyph();
    let seen = 0;

    flow.use({
      name: "disabled",
      enabled: false,
      setup() {
        seen += 1;
      }
    });

    expect(seen).toBe(0);
  });
});
