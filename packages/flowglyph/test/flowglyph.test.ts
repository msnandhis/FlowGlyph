import { describe, expect, it } from "vitest";
import { createFlowGlyph } from "../src/core";
import { responseTextAdapter } from "../src/adapters";
import { openAIResponsesAdapter } from "../src/adapters/openai";
import { createDOMRenderer } from "../src/dom";
import { markdownToHtml } from "../src/markdown";
import { installCodeCopy } from "../src/code";

describe("flowglyph single package", () => {
  it("exports the public subpath modules", async () => {
    const flow = createFlowGlyph();
    const events = [];

    for await (const event of responseTextAdapter("ok", {
      speed: "instant"
    })) {
      events.push(event);
    }

    expect(flow.getState().messages).toEqual([]);
    expect(events).toContainEqual(expect.objectContaining({ type: "part.delta" }));
    expect(openAIResponsesAdapter).toBeTypeOf("function");
    expect(createDOMRenderer).toBeTypeOf("function");
    expect(markdownToHtml("**ok**")).toContain("<strong>ok</strong>");
    expect(installCodeCopy).toBeTypeOf("function");
  });
});
