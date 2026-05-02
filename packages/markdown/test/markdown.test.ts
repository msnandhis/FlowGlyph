import { describe, expect, it } from "vitest";
import { markdownPlugin, markdownToHtml } from "../src/index";

describe("@flowglyph/markdown", () => {
  it("renders a safe markdown subset", () => {
    expect(markdownToHtml("# Hello\n\n- **One**\n- `Two`")).toBe(
      "<h1>Hello</h1><ul><li><strong>One</strong></li><li><code>Two</code></li></ul>"
    );
  });

  it("escapes raw html", () => {
    expect(markdownToHtml("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
    );
  });

  it("exports a plugin", () => {
    expect(markdownPlugin()).toMatchObject({ name: "flowglyph-markdown" });
  });
});
