import { describe, expect, it } from "vitest";
import {
  codeFenceToHtml,
  createLazyHighlighter,
  extractCodeFences,
  renderCodeBlockHtml,
  splitCodeFences
} from "../src/index";

describe("@flowglyph/code", () => {
  it("extracts fenced code blocks", () => {
    expect(extractCodeFences("before\n```ts\nconst x = 1;\n```\nafter")).toEqual([
      {
        language: "ts",
        code: "const x = 1;",
        start: 7,
        end: 29
      }
    ]);
  });

  it("splits text and code segments", () => {
    expect(splitCodeFences("A\n```js\nB\n```\nC")).toMatchObject([
      { type: "text", value: "A\n" },
      { type: "code", language: "js", value: "B" },
      { type: "text", value: "\nC" }
    ]);
  });

  it("escapes code html", () => {
    expect(codeFenceToHtml("html", "<div>")).toContain("&lt;div&gt;");
  });

  it("can render language labels and copy buttons", () => {
    expect(
      renderCodeBlockHtml({
        code: "const x = 1;",
        copyButton: true,
        language: "ts"
      })
    ).toContain('data-flowglyph-copy-code type="button"');
    expect(codeFenceToHtml("ts", "const x = 1;")).toContain(
      "fg-code-language"
    );
  });

  it("lazy-loads a highlighter once", async () => {
    let loads = 0;
    const highlighter = createLazyHighlighter(async () => {
      loads += 1;
      return (code) => `<mark>${code}</mark>`;
    });

    expect(await highlighter("a", "ts")).toBe("<mark>a</mark>");
    expect(await highlighter("b", "ts")).toBe("<mark>b</mark>");
    expect(loads).toBe(1);
  });
});
