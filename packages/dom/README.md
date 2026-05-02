# flowglyph/dom

Minimal DOM renderer for FlowGlyph.

## Install

```sh
pnpm add flowglyph
```

## Usage

```ts
import { createFlowGlyph } from "flowglyph/core";
import { createDOMRenderer } from "flowglyph/dom";

const flow = createFlowGlyph();
const renderer = createDOMRenderer("#answer");

const detach = renderer.attach(flow);
```

The renderer batches visual updates with `requestAnimationFrame` and keeps CSS customization simple through class hooks.
