# @flowglyph/react

Thin React bindings for FlowGlyph.

## Install

```sh
pnpm add @flowglyph/react @flowglyph/core react
```

## Usage

```tsx
import { rawTextAdapter } from "@flowglyph/adapters";
import { FlowGlyph } from "@flowglyph/react";

export function Answer() {
  return <FlowGlyph events={rawTextAdapter(["Hello", " world"])} />;
}
```

The React package delegates stream state to `@flowglyph/core` and subscribes with `useSyncExternalStore`.
