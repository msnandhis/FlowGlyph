import { describe, expect, it } from "vitest";
import { FlowGlyphView } from "../src/index";

describe("@flowglyph/react", () => {
  it("exports a view component", () => {
    expect(FlowGlyphView).toBeTypeOf("function");
  });
});
