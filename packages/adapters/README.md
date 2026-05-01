# @flowglyph/adapters

Lightweight stream adapters for FlowGlyph.

## Install

```sh
pnpm add @flowglyph/adapters @flowglyph/core
```

## Usage

```ts
import { sseAdapter } from "@flowglyph/adapters";

const response = await fetch("/api/chat", { method: "POST" });

await flow.consume(sseAdapter(response));
```

## Included Adapters

- `rawTextAdapter`
- `sseAdapter`
- `flowGlyphEventsAdapter`
- `vercelUIMessageStreamAdapter`

Provider-specific SDKs are intentionally not bundled.
