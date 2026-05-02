# FlowGlyph Architecture

FlowGlyph is published as one npm package with small subpath modules so the default path stays light.

```txt
backend/provider stream
  -> adapter
  -> flowglyph/core
  -> renderer
  -> framework wrapper
```

## Core

`flowglyph/core` is renderless and framework-agnostic.

It owns:

- normalized stream events
- message and part state
- plugin registration
- event emitter
- stream consumption
- cancel and retry hooks

It does not own:

- React
- DOM rendering
- provider SDKs
- markdown parsing
- syntax highlighting
- analytics

## Events

The public event contract uses message and part lifecycle events:

- `message.start`
- `part.start`
- `part.delta`
- `part.update`
- `part.end`
- `message.finish`
- `error`
- `unknown`

This keeps provider-specific details in adapters while giving renderers one stable state shape.

## Adapters

Adapters convert external stream formats into FlowGlyph events.

Implemented:

- `rawTextAdapter`
- `sseAdapter`
- `flowGlyphEventsAdapter`
- `vercelUIMessageStreamAdapter`

Direct provider adapters should be added only when there is real demand.

## Renderers

Renderers consume core state.

Implemented:

- `flowglyph/dom`
- `flowglyph/react`

DOM rendering uses `requestAnimationFrame` to batch visual updates.

React uses `useSyncExternalStore` so React owns rendering while the core remains framework-neutral.

## Public Package

Developers install one package:

```sh
pnpm add flowglyph
```

Public subpaths keep features modular:

- `flowglyph/core`
- `flowglyph/adapters`
- `flowglyph/adapters/openai`
- `flowglyph/dom`
- `flowglyph/react`
- `flowglyph/markdown`
- `flowglyph/code`
- `flowglyph/styles.css`
