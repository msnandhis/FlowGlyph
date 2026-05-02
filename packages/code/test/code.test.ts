import { describe, expect, it } from "vitest";
import { codeFenceToHtml, extractCodeFences, splitCodeFences } from "../src/index";

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
});
