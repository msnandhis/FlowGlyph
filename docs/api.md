# FlowGlyph API

## Core

```ts
import { createFlowGlyph } from "@flowglyph/core";

const flow = createFlowGlyph({
  onRetry() {
    // Reconnect or restart the request.
  }
});
```

### `flow.consume(events)`

Consumes an iterable or async iterable of normalized FlowGlyph events.

```ts
await flow.consume(events);
```

### `flow.subscribe(listener)`

Subscribes to state changes.

```ts
const unsubscribe = flow.subscribe((state) => {
  console.log(state.messages);
});
```

### `flow.use(plugin)`

Registers a plugin and returns a cleanup function.

```ts
const disable = flow.use({
  name: "logger",
  setup(api) {
    return api.on("event", console.log);
  }
});
```

## Adapters

```ts
import {
  rawTextAdapter,
  responseTextAdapter,
  sseAdapter
} from "@flowglyph/adapters";
```

### `rawTextAdapter(input, options?)`

Turns string chunks into one assistant message with one text part.

### `responseTextAdapter(input, options?)`

Turns a normal non-streaming string, `Response`, promise, or JSON response into a paced text stream.

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

Supported speed options:

```ts
responseTextAdapter(response, { speed: "instant" });
responseTextAdapter(response, { speed: { delayMs: 24, chunkSize: 4 } });
responseTextAdapter(response, { speed: { charsPerSecond: 80, chunkSize: 4 } });
```

For JSON responses, FlowGlyph automatically looks for common fields like `text`, `content`, `message`, `answer`, and `output`. You can also provide `selectText`.

### `sseAdapter(response, options?)`

Parses SSE messages and emits FlowGlyph events when the SSE `data` value is already a FlowGlyph event.

### `vercelUIMessageStreamAdapter(response, options?)`

Starter adapter for Vercel AI SDK UI message streams.

## OpenAI Playground Route

The playground includes a development-only `/api/openai` route in `apps/playground/vite.config.ts`.

It calls the OpenAI Responses API with `stream: true`, reads OpenAI's server-sent events, and emits FlowGlyph-normalized SSE events back to the browser.

Configure it with:

```sh
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-nano
```

The SDK packages do not depend on OpenAI. This route exists only to prove a real provider stream end to end.

## DOM

```ts
import { createDOMRenderer } from "@flowglyph/dom";

const renderer = createDOMRenderer("#answer");
const detach = renderer.attach(flow);
```

## React

```tsx
import { rawTextAdapter } from "@flowglyph/adapters";
import { FlowGlyph } from "@flowglyph/react";

export function Demo() {
  return <FlowGlyph events={rawTextAdapter(["Hello", " world"])} />;
}
```
