# Vanilla DOM Quickstart

Install the core, DOM renderer, adapters, and optional styles:

```sh
pnpm add flowglyph
```

```ts
import { createFlowGlyph } from "flowglyph/core";
import { createDOMRenderer } from "flowglyph/dom";
import { sseAdapter } from "flowglyph/adapters";
import "flowglyph/styles.css";

const flow = createFlowGlyph({ mode: "conversation" });
const renderer = createDOMRenderer("#answer");
const detach = renderer.attach(flow);

const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ message: "Explain streams" })
});

await flow.consume(sseAdapter(response));

detach();
```

For normal non-streaming responses:

```ts
import { responseTextAdapter } from "flowglyph/adapters";

await flow.consume(
  responseTextAdapter(await fetch("/api/answer"), {
    speed: { charsPerSecond: 90, chunkSize: 4 }
  })
);
```
