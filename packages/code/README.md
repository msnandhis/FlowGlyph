# @flowglyph/code

Lightweight code fence helpers for FlowGlyph.

```ts
import { extractCodeFences } from "@flowglyph/code";

const blocks = extractCodeFences(markdown);
```

This package does not bundle a syntax highlighter. Use it to detect and render code blocks, then lazy-load a highlighter only when your app needs one.
