# flowglyph/markdown

Tiny markdown helpers for FlowGlyph text parts.

```tsx
import { markdownToHtml } from "flowglyph/markdown";
import { FlowGlyph } from "flowglyph/react";
import { installCodeCopy } from "flowglyph/code";

useEffect(() => installCodeCopy(), []);

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
/>;
```

This package intentionally supports a small markdown subset. For large docs or advanced syntax highlighting, lazy-load a full markdown renderer in your app.
