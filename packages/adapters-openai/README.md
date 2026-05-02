# flowglyph/adapters/openai

OpenAI Responses API stream adapter for FlowGlyph.

```ts
import { openAIResponsesAdapter } from "flowglyph/adapters/openai";

const response = await fetch("/api/openai-stream");
await flow.consume(openAIResponsesAdapter(response));
```

The adapter parses OpenAI server-sent events into FlowGlyph events. It does not call OpenAI directly and does not include the OpenAI SDK, so apps can keep provider credentials on their own backend.
