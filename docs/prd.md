# FlowGlyph PRD

## 1. Product Summary

FlowGlyph is a lightweight, framework-agnostic TypeScript SDK for rendering AI response streams in web applications.

It gives developers a clean way to display streamed text, markdown, code blocks, tool calls, status updates, partial updates, errors, retry states, cancellation, and resume behavior without building custom UI glue for every product.

## 2. Product Name

Product name: FlowGlyph

Public package target: `flowglyph`

Public subpaths:

- `flowglyph/core`
- `flowglyph/dom`
- `flowglyph/react`
- `flowglyph/markdown`
- `flowglyph/code`
- `flowglyph/adapters`

## 3. One-Line Description

FlowGlyph renders AI response streams beautifully in any JavaScript app.

## 4. Problem Statement

AI apps increasingly stream output instead of returning one final response. A single response may include:

- text deltas
- markdown
- code blocks
- tool calls
- tool results
- progress statuses
- partial structured data
- errors
- retry or resume states

Most teams still build this rendering and state-management layer themselves. The result is duplicated work, fragile UI state, inconsistent streaming behavior, and framework-specific implementations that are difficult to reuse.

## 5. Target Users

Primary users:

- frontend developers building AI-powered product experiences
- full-stack developers adding chat, copilot, assistant, or agent UI
- SaaS teams embedding AI responses inside existing workflows
- open source maintainers building AI developer tools

Secondary users:

- design engineers who need polished streaming UI behavior
- AI platform teams that want consistent rendering across internal apps
- agencies building repeated AI features for client products

## 6. Target Use Cases

FlowGlyph should support:

- AI chat response rendering
- copilots inside SaaS apps
- code generation output
- writing assistants
- agent progress displays
- support assistants
- workflow automation assistants
- document analysis response panels
- model playground result panels

## 7. Goals

FlowGlyph must:

- solve one focused workflow: AI stream rendering
- work with any backend or model provider
- keep the core framework-agnostic
- expose a simple TypeScript API
- provide a plugin system
- support lightweight DOM rendering
- provide a thin React wrapper first
- normalize provider-specific streams through adapters
- keep markdown and syntax highlighting optional
- batch visual updates for smooth streaming
- support cancellation and retry hooks
- be easy to integrate in under 10 minutes

## 8. Non-Goals

FlowGlyph should not be:

- a model provider SDK
- an agent framework
- a prompt management platform
- a backend framework
- a database or conversation store
- a full design system
- a hosted observability platform in v1
- a replacement for Vercel AI SDK, LangChain, or provider SDKs

FlowGlyph should work alongside those tools.

## 9. Positioning

FlowGlyph sits between a backend stream and a frontend UI.

```txt
Provider or backend
  -> adapter normalizes stream events
  -> FlowGlyph core manages stream state
  -> renderer displays output
  -> framework wrapper connects lifecycle
```

The product should be positioned as:

> The renderer layer for AI streams.

Not:

> A full AI application framework.

## 10. Provider Strategy

Different providers stream different shapes of data. FlowGlyph should not place provider SDKs inside the core.

Instead, FlowGlyph uses adapters.

Examples:

- raw text adapter
- Server-Sent Events adapter
- Vercel AI SDK UI message stream adapter
- OpenAI adapter
- Anthropic adapter
- Gemini adapter
- custom adapter helper

Adapters convert provider-specific streams into FlowGlyph's normalized event model.

## 11. Normalized Stream Event Model

The core should consume a provider-neutral stream event format.

Implemented event model:

```ts
type FlowGlyphEvent =
  | { type: "message.start"; messageId: string; role?: "assistant" | "user" | "system"; metadata?: unknown }
  | { type: "part.start"; messageId: string; partId: string; kind: "text" | "reasoning" | "tool" | "data" | "source" | "file" | "status"; name?: string; index?: number; metadata?: unknown }
  | { type: "part.delta"; messageId: string; partId: string; delta: string | unknown; format?: "text" | "json-text" | "patch" }
  | { type: "part.update"; messageId: string; partId: string; state?: "pending" | "streaming" | "complete" | "error" | "aborted"; value?: unknown; label?: string }
  | { type: "part.end"; messageId: string; partId: string }
  | { type: "step.start"; messageId: string; stepId?: string }
  | { type: "step.finish"; messageId: string; stepId?: string; usage?: unknown }
  | { type: "message.finish"; messageId: string; status: "complete" | "aborted" | "error"; reason?: string; usage?: unknown }
  | { type: "error"; messageId?: string; partId?: string; error: { message: string; code?: string }; recoverable?: boolean }
  | { type: "unknown"; provider?: string; raw: unknown };
```

The event model is intentionally part-based. Text, reasoning, tool calls, data, sources, files, and status updates all share the same lifecycle, which keeps the core scalable while adapters handle provider-specific shapes.

## 12. Core SDK Requirements

The core package should provide:

- `createFlowGlyph()`
- `flow.use(plugin)`
- `flow.on(event, handler)`
- `flow.off(event, handler)`
- `flow.emit(event, payload)`
- `flow.consume(stream)`
- `flow.cancel()`
- `flow.retry()`
- `flow.getState()`
- `flow.subscribe(listener)`
- plugin lifecycle hooks
- minimal internal state manager
- configuration system
- typed public events

The core must not include:

- React
- Vue
- Angular
- Svelte
- markdown parser
- syntax highlighter
- provider SDKs
- analytics SDKs
- heavy UI dependencies

## 13. State Model

The internal state should represent messages as structured renderable parts.

Draft shape:

```ts
type FlowGlyphMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  status: "idle" | "streaming" | "complete" | "error" | "cancelled";
  parts: FlowGlyphPart[];
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type FlowGlyphPart =
  {
    id: string;
    kind: "text" | "reasoning" | "tool" | "data" | "source" | "file" | "status";
    state: "pending" | "streaming" | "complete" | "error" | "aborted";
    name?: string;
    text?: string;
    label?: string;
    value?: unknown;
  };
```

The state model should prioritize append and patch operations because streamed output updates frequently.

## 14. Plugin System

Plugins should extend FlowGlyph without modifying core internals.

Draft plugin interface:

```ts
type FlowGlyphPlugin = {
  name: string;
  version?: string;
  setup: (api: FlowGlyphPluginAPI) => void | (() => void);
};
```

Plugin capabilities:

- subscribe to stream events
- register renderers
- transform events
- add commands
- add lifecycle hooks
- add adapter helpers
- register theme tokens
- clean up on disable

Example:

```ts
flow.use(markdownPlugin());
flow.use(codePlugin());
flow.use(toolCallPlugin());
```

## 15. Renderer Strategy

Rendering should be split from core state.

Core:

- consumes stream events
- updates state
- emits state changes

Renderers:

- DOM renderer
- React wrapper
- future Vue, Svelte, Angular, and Solid wrappers

This keeps framework-specific code out of the core package.

## 16. Framework Wrapper Strategy

Wrappers should be thin.

They should:

- create and dispose FlowGlyph instances
- bind lifecycle
- subscribe to state changes
- expose idiomatic framework APIs
- delegate stream logic to core

They should not:

- duplicate stream parsing
- duplicate the state machine
- include provider-specific logic
- become full chat frameworks

## 17. First Version Scope

The first useful version includes:

- `flowglyph/core`
- `flowglyph/dom`
- `flowglyph/react`
- `flowglyph/adapters`
- raw text adapter
- SSE adapter
- Vercel UI message stream adapter starter
- simple normalized event adapter
- text streaming
- status rendering
- error rendering
- cancel hook
- retry hook
- basic theme tokens
- plugin registration
- unit tests for core behavior
- one playground app

The first scaffold intentionally keeps markdown and code rendering out of the core.

Markdown and code rendering can start as optional plugins or simple stubs.

## 18. Package Structure

Recommended monorepo structure:

```txt
FlowGlyph/
  README.md
  docs/
    prd.md
    architecture.md
    api.md
    plugins.md
    adapters.md
    wrappers.md
    roadmap.md
  packages/
    flowglyph/        # public npm package
    core/
    dom/
    react/
    adapters/
    markdown/
    code/
    styles/
  apps/
    playground/
    docs/
  private/
    pro/
    enterprise/
  research/
    name-research.md
    market.md
    competitors.md
```

Only `README.md` and `docs/prd.md` are required during the planning stage.

## 19. Developer Experience

The API should feel small and obvious.

Core direction:

```ts
const flow = createFlowGlyph();

flow.use(markdownPlugin());
flow.on("error", (error) => console.error(error));

await flow.consume(stream);
```

DOM direction:

```ts
const flow = createFlowGlyph({
  renderer: createDOMRenderer("#answer")
});
```

React direction:

```tsx
<FlowGlyph stream={stream} plugins={[markdownPlugin()]} />
```

## 20. Performance Requirements

FlowGlyph should be designed for frequent partial updates.

Performance requirements:

- batch updates where possible
- use `requestAnimationFrame` for visual flushes where useful
- avoid re-rendering unchanged message parts
- keep core dependency-free or near dependency-free
- make markdown parsing optional
- make syntax highlighting optional
- lazy load heavy plugins
- avoid provider SDKs in default package
- avoid global mutable state
- keep renderers incremental

## 21. Theming Requirements

The first theme system should be lightweight.

Prefer:

- CSS variables
- minimal class names
- optional default stylesheet
- easy override points

Avoid:

- large CSS-in-JS dependency
- bundled design system
- hardcoded visual identity

## 22. Accessibility Requirements

FlowGlyph should support:

- readable semantic output
- ARIA live-region options for streaming updates
- reduced-motion friendly behavior
- keyboard-accessible action buttons
- visible error and retry states

Streaming output should not create noisy screen reader behavior by default. Accessibility behavior may need configuration.

## 23. Commercial Model

Open source core:

- core state and stream handling
- DOM renderer
- basic React wrapper
- basic adapters
- free plugins
- docs and playground

Paid extensions may include:

- analytics
- advanced renderers
- team configuration
- enterprise theme packs
- audit logs
- hosted stream replay
- error monitoring
- provider usage insights
- priority support
- commercial license, depending on final licensing model

Paid code should remain separate from the open source core.

## 24. Licensing Considerations

The license must be chosen before public package release.

Options:

- permissive core such as MIT or Apache-2.0 plus proprietary paid extensions
- copyleft plus commercial dual license
- source-available commercial license, if commercial production restrictions are required

The project should not claim "open source" while also restricting normal commercial use under a non-open-source license.

## 25. Competitive Landscape

Important adjacent tools:

- Vercel AI SDK
- assistant-ui
- CopilotKit
- LangChain UI patterns and ecosystem examples
- custom internal chat renderers

FlowGlyph should differentiate by being:

- provider-neutral
- framework-neutral
- renderer-focused
- lightweight
- plugin-friendly
- easy to embed in existing apps

## 26. Risks

Main risks:

- category overlap with existing AI UI libraries
- stream event model becomes too broad
- adapters become maintenance-heavy
- markdown and code rendering increase bundle size
- framework wrappers drift away from core behavior
- the product expands into a full AI app framework too early

Mitigation:

- keep v1 focused on rendering
- keep provider logic in adapters
- make heavy features optional
- test the event model early with real streams
- build React and DOM first before expanding wrappers

## 27. Milestones

### Milestone 0: Planning

- decide product name
- write PRD
- define package strategy
- define first event model
- define v1 scope

### Milestone 1: Core Prototype

- create monorepo
- implement `flowglyph/core`
- implement event emitter
- implement state model
- implement plugin registration
- implement normalized event consumption

### Milestone 2: First Renderer

- implement `flowglyph/dom`
- render text streaming
- render status and error states
- support cancel and retry callbacks

### Milestone 3: React Wrapper

- implement `flowglyph/react`
- expose simple component
- expose hook if useful
- verify no duplicated stream logic

### Milestone 4: Adapters

- raw text adapter
- SSE adapter
- normalized event adapter
- Vercel AI SDK adapter if useful

### Milestone 5: Playground

- create demo app
- show streaming text
- show markdown/code plugin placeholder
- show tool call/status states
- show retry/cancel

### Milestone 6: Public Alpha

- add docs
- add tests
- add bundle check
- publish alpha package
- collect feedback

## 28. Success Metrics

Early success:

- developer can integrate in under 10 minutes
- core package remains small
- text streaming feels smooth
- React wrapper does not duplicate core logic
- provider adapters remain optional
- examples are easy to understand

Community success:

- stars, issues, discussions, and early package installs
- developers request additional adapters or wrappers
- external contributors can write plugins

Commercial success:

- teams ask for analytics, advanced rendering, support, or enterprise controls
- companies use it in production workflows
- paid extension boundaries become clear from real demand

## 29. Open Questions

- Should the primary public API be stream-first, message-first, or renderer-first?
- Should markdown be a first-party optional plugin or a documented integration pattern?
- Should React expose a component only, a hook only, or both?
- How much of the Vercel AI SDK data stream protocol should be supported in v1?
- Should the DOM renderer be required for vanilla usage, or should core expose renderless state only?
- What final license should be used for public release?

## 30. Initial Recommendation

Build FlowGlyph in this order:

1. core event and state model
2. normalized stream consumer
3. vanilla DOM renderer
4. React wrapper
5. SSE adapter
6. playground
7. markdown and code plugins

This gives the project a useful demo quickly while keeping the architecture small and extensible.
