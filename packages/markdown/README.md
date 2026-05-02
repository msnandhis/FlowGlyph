# @flowglyph/markdown

Tiny markdown helpers for FlowGlyph text parts.

```tsx
import { markdownToHtml } from "@flowglyph/markdown";
import { FlowGlyph } from "@flowglyph/react";

<FlowGlyph
  events={events}
  renderText={(text) => (
    <span dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
  )}
/>;
```

This package intentionally supports a small markdown subset. For large docs or advanced syntax highlighting, lazy-load a full markdown renderer in your app.
