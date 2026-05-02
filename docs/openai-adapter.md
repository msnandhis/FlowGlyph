# OpenAI Adapter Guide

Install:

```sh
pnpm add @flowglyph/core @flowglyph/adapters @flowglyph/adapters-openai
```

Keep your OpenAI API key on your server. The browser should call your route, then FlowGlyph parses the returned OpenAI server-sent events.

```ts
import { openAIResponsesAdapter } from "@flowglyph/adapters-openai";

const response = await fetch("/api/openai-stream", {
  method: "POST",
  body: JSON.stringify({ message: "Write a release note" })
});

await flow.consume(openAIResponsesAdapter(response));
```

If you want display pacing on top of the live provider stream:

```ts
import { paceTextDeltasAdapter } from "@flowglyph/adapters";
import { openAIResponsesAdapter } from "@flowglyph/adapters-openai";

await flow.consume(
  paceTextDeltasAdapter(openAIResponsesAdapter(response), {
    speed: { charsPerSecond: 120, chunkSize: 4 }
  })
);
```

FlowGlyph does not depend on the OpenAI SDK. The adapter only maps OpenAI Responses API stream events into normalized FlowGlyph events.
