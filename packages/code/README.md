# @flowglyph/code

Lightweight code fence helpers for FlowGlyph.

```ts
import { extractCodeFences } from "@flowglyph/code";

const blocks = extractCodeFences(markdown);
```

Render code block HTML with an optional language label and copy button:

```ts
import { codeFenceToHtml, installCodeCopy } from "@flowglyph/code";

const html = codeFenceToHtml("ts", "const ok = true;", {
  copyButton: true
});

const cleanup = installCodeCopy();
```

Lazy-load a highlighter only when your app needs one:

```ts
import { createLazyHighlighter } from "@flowglyph/code";

const highlight = createLazyHighlighter(async () => {
  const { codeToHtml } = await import("shiki");

  return (code, language) =>
    codeToHtml(code, {
      lang: language || "text",
      theme: "github-dark"
    });
});
```

This package does not bundle a syntax highlighter.
