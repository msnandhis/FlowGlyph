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

export type CodeHighlighter = (
  code: string,
  language: string
) => string | Promise<string>;

export type CodeBlockHtmlOptions = {
  classPrefix?: string;
  copyButton?: boolean;
  highlightedHtml?: string | undefined;
  languageLabel?: boolean;
};

export type RenderCodeBlockHtmlInput = CodeBlockHtmlOptions & {
  code: string;
  language: string;
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

export function codeFenceToHtml(
  language: string,
  code: string,
  options: CodeBlockHtmlOptions = {}
): string {
  return renderCodeBlockHtml({
    code,
    language,
    ...options
  });
}

export function renderCodeBlockHtml({
  classPrefix = "fg",
  code,
  copyButton = false,
  highlightedHtml,
  language,
  languageLabel = true
}: RenderCodeBlockHtmlInput): string {
  const languageAttribute = language
    ? ` data-language="${escapeHtml(language)}"`
    : "";
  const label =
    languageLabel && language
      ? `<span class="${classPrefix}-code-language">${escapeHtml(language)}</span>`
      : "";
  const button = copyButton
    ? `<button class="${classPrefix}-copy" data-flowglyph-copy-code type="button">Copy</button>`
    : "";
  const header =
    label || button
      ? `<div class="${classPrefix}-code-header">${label}${button}</div>`
      : "";
  const body = highlightedHtml ?? escapeHtml(code);

  return `<div class="${classPrefix}-code-block" data-flowglyph-code-block>${header}<pre class="${classPrefix}-code"><code${languageAttribute}>${body}</code></pre></div>`;
}

export function createLazyHighlighter(
  loader: () => Promise<CodeHighlighter>
): CodeHighlighter {
  let highlighterPromise: Promise<CodeHighlighter> | undefined;

  return async (code, language) => {
    highlighterPromise ??= loader();
    const highlighter = await highlighterPromise;
    return highlighter(code, language);
  };
}

export function installCodeCopy(root: Document | HTMLElement = document): () => void {
  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("[data-flowglyph-copy-code]");
    if (!button) return;

    const block = button.closest("[data-flowglyph-code-block], .fg-code-block");
    const codeNode = block?.querySelector("code");
    const text = codeNode?.textContent ?? "";

    if (!text || !navigator.clipboard) return;

    void navigator.clipboard.writeText(text);
  };

  root.addEventListener("click", handleClick);

  return () => {
    root.removeEventListener("click", handleClick);
  };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
