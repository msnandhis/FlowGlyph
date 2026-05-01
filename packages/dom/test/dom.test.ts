import { describe, expect, it } from "vitest";
import { createDOMRenderer } from "../src/index";

describe("@flowglyph/dom", () => {
  it("exports a renderer factory", () => {
    expect(createDOMRenderer).toBeTypeOf("function");
  });
});
