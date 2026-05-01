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

## Implemented Package Shape

```txt
@flowglyph/core
@flowglyph/dom
@flowglyph/react
@flowglyph/adapters
```

Future packages may include markdown, code highlighting, Vue, Angular, Svelte, Solid, analytics, enterprise observability, and advanced renderers.

## Quick Start

```ts
import { createFlowGlyph } from "@flowglyph/core";
import { createDOMRenderer } from "@flowglyph/dom";
import { sseAdapter } from "@flowglyph/adapters";

const flow = createFlowGlyph();
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
import { rawTextAdapter } from "@flowglyph/adapters";
import { FlowGlyph } from "@flowglyph/react";

export function AssistantAnswer() {
  return <FlowGlyph events={rawTextAdapter(["Hello", " world"])} />;
}
```

## Workspace Commands

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm dev
```

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
- DOM renderer
- React wrapper
- Vite playground
- unit tests

See the full PRD in [docs/prd.md](docs/prd.md).
