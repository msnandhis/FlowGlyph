# flowglyph

Lightweight AI stream rendering SDK for JavaScript apps.

FlowGlyph normalizes AI response streams into small UI events and gives you renderer modules for DOM and React without forcing a provider SDK or framework into your core bundle.

```sh
pnpm add flowglyph
```

## Use Only What You Need

```ts
import { createFlowGlyph } from "flowglyph";
import { responseTextAdapter } from "flowglyph/adapters";
import { openAIResponsesAdapter } from "flowglyph/adapters/openai";
import "flowglyph/styles.css";
```

Subpath imports keep the SDK modular:

- `flowglyph/core`
- `flowglyph/adapters`
- `flowglyph/adapters/openai`
- `flowglyph/dom`
- `flowglyph/react`
- `flowglyph/markdown`
- `flowglyph/code`
- `flowglyph/styles.css`

## Quick Start

```ts
import { createFlowGlyph } from "flowglyph/core";
import { responseTextAdapter } from "flowglyph/adapters";

const flow = createFlowGlyph({ mode: "single" });

flow.subscribe((state) => {
  console.log(state.messages.at(-1)?.parts.at(-1)?.content);
});

await flow.consume(
  responseTextAdapter(await fetch("/api/answer"), {
    speed: { charsPerSecond: 90, chunkSize: 4 }
  })
);
```

## OpenAI Stream Adapter

```ts
import { createFlowGlyph } from "flowglyph/core";
import { openAIResponsesAdapter } from "flowglyph/adapters/openai";

const flow = createFlowGlyph();
const response = await fetch("/api/openai-stream");

await flow.consume(openAIResponsesAdapter(response));
```

The OpenAI adapter parses Responses API server-sent events. It does not include the OpenAI SDK and does not call OpenAI directly.

## React

```tsx
import { FlowGlyph } from "flowglyph/react";
import { rawTextAdapter } from "flowglyph/adapters";
import "flowglyph/styles.css";

export function Answer() {
  return <FlowGlyph events={rawTextAdapter(["Hello", " world"])} />;
}
```

## License

MIT.
