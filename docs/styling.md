# Styling Guide

FlowGlyph styles are optional and shipped through npm:

```sh
pnpm add flowglyph
```

```ts
import "flowglyph/styles.css";
```

The stylesheet covers:

- message containers
- text and reasoning parts
- status and error states
- tool-call panels
- code blocks
- language labels
- copy buttons

Override CSS variables in your app:

```css
.fg-root {
  --fg-color: #101828;
  --fg-muted-color: #667085;
  --fg-surface: #f9fafb;
  --fg-border-color: #eaecf0;
  --fg-radius: 6px;
  --fg-font-family: Inter, system-ui, sans-serif;
  --fg-mono-font-family: "SFMono-Regular", Consolas, monospace;
}
```

Code block copy buttons need the small optional helper:

```ts
import { installCodeCopy } from "flowglyph/code";

const cleanup = installCodeCopy();
```
