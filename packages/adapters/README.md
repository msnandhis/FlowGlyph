# @flowglyph/adapters

Lightweight stream adapters for FlowGlyph.

## Install

```sh
pnpm add @flowglyph/adapters @flowglyph/core
```

## Usage

```ts
import {
  paceTextDeltasAdapter,
  responseTextAdapter,
  sseAdapter
} from "@flowglyph/adapters";

const response = await fetch("/api/chat", { method: "POST" });

await flow.consume(sseAdapter(response));
```

For normal non-streaming responses:

```ts
const response = await fetch("/api/answer");

await flow.consume(
  responseTextAdapter(response, {
    speed: {
      charsPerSecond: 80,
      chunkSize: 4
    }
  })
);
```

For live provider streams that already emit FlowGlyph events:

```ts
await flow.consume(
  paceTextDeltasAdapter(sseAdapter(response), {
    speed: {
      charsPerSecond: 120,
      chunkSize: 4
    }
  })
);
```

## Included Adapters

- `rawTextAdapter`
- `responseTextAdapter`
- `paceTextDeltasAdapter`
- `sseAdapter`
- `flowGlyphEventsAdapter`
- `vercelUIMessageStreamAdapter`

Provider-specific SDKs are intentionally not bundled.
