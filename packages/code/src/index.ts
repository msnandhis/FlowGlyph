export type CodeFence = {
  language: string;
  code: string;
  start: number;
  end: number;
};

export type CodeSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "code";
      language: string;
      value: string;
    };

const fencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;

export function extractCodeFences(markdown: string): CodeFence[] {
  const fences: CodeFence[] = [];

  for (const match of markdown.matchAll(fencePattern)) {
    const rawLanguage = match[1] ?? "";
    const code = match[2] ?? "";
    const start = match.index ?? 0;

    fences.push({
      language: rawLanguage.trim(),
      code: code.replace(/\n$/, ""),
      start,
      end: start + match[0].length
    });
  }

  return fences;
}

export function splitCodeFences(markdown: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let cursor = 0;

  for (const fence of extractCodeFences(markdown)) {
    if (fence.start > cursor) {
      segments.push({
        type: "text",
        value: markdown.slice(cursor, fence.start)
      });
    }

    segments.push({
      type: "code",
      language: fence.language,
      value: fence.code
    });
    cursor = fence.end;
  }

  if (cursor < markdown.length) {
    segments.push({
      type: "text",
      value: markdown.slice(cursor)
    });
  }

  return segments;
}

export function codeFenceToHtml(language: string, code: string): string {
  const languageAttribute = language
    ? ` data-language="${escapeHtml(language)}"`
    : "";

  return `<pre class="fg-code"><code${languageAttribute}>${escapeHtml(code)}</code></pre>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
