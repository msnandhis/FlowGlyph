# React Quickstart

Install the React wrapper, adapters, and optional styles:

```sh
pnpm add flowglyph react
```

Render a normal stream:

```tsx
import { rawTextAdapter } from "flowglyph/adapters";
import { FlowGlyph } from "flowglyph/react";
import "flowglyph/styles.css";

export function Answer() {
  return <FlowGlyph events={rawTextAdapter(["Hello", " from FlowGlyph"])} />;
}
```

Use the hook when you need controls:

```tsx
import { responseTextAdapter } from "flowglyph/adapters";
import { FlowGlyphView, useFlowGlyphStream } from "flowglyph/react";

export function AnswerBox({ text }: { text: string }) {
  const { cancel, flow, retry } = useFlowGlyphStream({
    events: responseTextAdapter(text, {
      speed: { charsPerSecond: 90, chunkSize: 4 }
    }),
    mode: "single"
  });

  return (
    <>
      <button onClick={cancel}>Cancel</button>
      <button onClick={() => void retry()}>Retry</button>
      <FlowGlyphView flow={flow} />
    </>
  );
}
```

Markdown and code blocks:

```tsx
import { installCodeCopy } from "flowglyph/code";
import { markdownToHtml } from "flowglyph/markdown";
import { FlowGlyph } from "flowglyph/react";
import { useEffect } from "react";

export function MarkdownAnswer({ events }) {
  useEffect(() => installCodeCopy(), []);

  return (
    <FlowGlyph
      events={events}
      renderText={(text) => (
        <span
          dangerouslySetInnerHTML={{
            __html: markdownToHtml(text, {
              code: { copyButton: true }
            })
          }}
        />
      )}
    />
  );
}
```
