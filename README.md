# FlowGlyph

FlowGlyph is a lightweight, framework-agnostic SDK for rendering AI response streams in web applications.

It turns model output, text deltas, markdown, code blocks, tool calls, status updates, retries, cancellations, and errors into clean UI state that can be rendered in any JavaScript framework.

## One-Line Description

FlowGlyph renders AI response streams beautifully in any JavaScript app.

## Why This Exists

AI applications often stream partial text, tool calls, code, markdown, and status updates. Most teams still build this UI glue themselves for every chat app, copilot, writing tool, support assistant, or agent interface.

FlowGlyph should make that workflow feel like installing a small UI primitive:

```txt
install package
connect stream
mount renderer
ship clean AI streaming UI
```

## Product Scope

FlowGlyph is not a model SDK, agent framework, backend framework, or hosted AI platform.

It focuses on one job:

> Normalize and render AI response streams across providers and frameworks.

## Public Package Shape

```txt
flowglyph
flowglyph/core
flowglyph/dom
flowglyph/react
flowglyph/adapters
flowglyph/adapters/openai
flowglyph/markdown
flowglyph/code
flowglyph/styles.css
```

Future packages may include Vue, Angular, Svelte, Solid, Anthropic/Gemini adapters, analytics, enterprise observability, and advanced renderers.

## Install

```sh
pnpm add flowglyph
```

For React rendering, also install React if your app does not already have it.

## Quick Start

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
  body: JSON.stringify({ message: "Explain Redis streams" })
});

await flow.consume(sseAdapter(response));

detach();
```

React:

```tsx
import { rawTextAdapter } from "flowglyph/adapters";
import { FlowGlyph } from "flowglyph/react";
import "flowglyph/styles.css";

export function AssistantAnswer() {
  return <FlowGlyph events={rawTextAdapter(["Hello", " world"])} />;
}
```

Normal non-streaming responses can be displayed with a paced stream effect:

```ts
import { responseTextAdapter } from "flowglyph/adapters";

await flow.consume(
  responseTextAdapter(await fetch("/api/answer"), {
    speed: { charsPerSecond: 90, chunkSize: 4 }
  })
);
```

OpenAI Responses API streams can be normalized without bundling the OpenAI SDK:

```ts
import { openAIResponsesAdapter } from "flowglyph/adapters/openai";

const response = await fetch("/api/openai-stream");
await flow.consume(openAIResponsesAdapter(response));
```

## Guides

- [React quickstart](docs/react-quickstart.md)
- [Vanilla DOM quickstart](docs/vanilla-dom-quickstart.md)
- [OpenAI adapter guide](docs/openai-adapter.md)
- [Speed and pacing](docs/speed-pacing.md)
- [Styling guide](docs/styling.md)
- [API reference](docs/api.md)

## Workspace Commands

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm pack:dry-run
pnpm dev
```

## Publishing

Current package version: `0.1.0`.

The public npm package is:

```txt
flowglyph
```

Before publishing:

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm pack:dry-run
pnpm --filter flowglyph publish --dry-run --access public --no-git-checks
```

To publish, log in to npm, then publish from the repository root:

```sh
npm login
pnpm publish:npm
```

Publishing is intentionally manual for now.

## Key Principles

- TypeScript-first
- framework-agnostic core
- provider-neutral adapters
- small default bundle
- plugin-based architecture
- minimal dependencies
- tree-shakeable modules
- no React, Vue, Angular, or Svelte inside core
- no model provider lock-in

## Current Status

Working v0 scaffold.

Implemented:

- framework-agnostic core
- part-lifecycle stream event model
- plugin registration and cleanup
- minimal state manager
- raw text adapter
- SSE adapter
- Vercel UI message stream adapter starter
- OpenAI Responses API stream adapter
- normal response pacing with configurable speed
- conversation and single-message modes
- optional CSS shipped from the same npm package
- markdown helper package
- code fence helper package
- code block language labels, copy helper, and lazy highlighter hook
- React hook API
- tool-call rendering in React and DOM
- DOM renderer
- React wrapper
- Vite playground
- unit tests

See the full PRD in [docs/prd.md](docs/prd.md).
