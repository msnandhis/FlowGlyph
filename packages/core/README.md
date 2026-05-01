# @flowglyph/core

Framework-agnostic core for rendering AI response streams.

## Install

```sh
pnpm add @flowglyph/core
```

## Usage

```ts
import { createFlowGlyph } from "@flowglyph/core";

const flow = createFlowGlyph();

flow.subscribe((state) => {
  console.log(state.messages);
});

await flow.consume([
  { type: "message.start", messageId: "m1", role: "assistant" },
  { type: "part.start", messageId: "m1", partId: "p1", kind: "text" },
  { type: "part.delta", messageId: "m1", partId: "p1", delta: "Hello" },
  { type: "part.end", messageId: "m1", partId: "p1" },
  { type: "message.finish", messageId: "m1", status: "complete" }
]);
```

## What It Includes

- normalized message and part lifecycle events
- small state manager
- event emitter
- plugin registration and cleanup
- cancel and retry hooks

Core does not include React, DOM rendering, provider SDKs, markdown parsing, or syntax highlighting.
