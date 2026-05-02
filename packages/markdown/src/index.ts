import {
  renderCodeBlockHtml,
  type CodeBlockHtmlOptions
} from "@flowglyph/code";
import type { FlowGlyphPlugin } from "@flowglyph/core";

export type MarkdownOptions = {
  classPrefix?: string;
};

export type MarkdownRenderOptions = {
  code?: CodeBlockHtmlOptions | undefined;
};

export function markdownPlugin(options: MarkdownOptions = {}): FlowGlyphPlugin {
  return {
    name: "flowglyph-markdown",
    setup(api) {
      api.emit("event", {
        type: "unknown",
        provider: "flowglyph-markdown",
        raw: {
          classPrefix: options.classPrefix ?? "fg"
        }
      });
    }
  };
}

export function markdownToHtml(
  markdown: string,
  options: MarkdownRenderOptions = {}
): string {
  const blocks = splitBlocks(markdown);
  return blocks.map((block) => renderBlock(block, options)).join("");
}

export function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" rel="noreferrer" target="_blank">$1</a>'
    );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type MarkdownBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      value: string;
    }
  | {
      type: "list";
      ordered: boolean;
      items: string[];
    }
  | {
      type: "code";
      language: string;
      value: string;
    }
  | {
      type: "paragraph";
      value: string;
    };

function splitBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | undefined;
  let code: { language: string; lines: string[] } | undefined;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", value: paragraph.join(" ") });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = undefined;
  };

  for (const line of lines) {
    const fence = line.match(/^```([^`]*)$/);
    if (fence) {
      if (code) {
        blocks.push({
          type: "code",
          language: code.language,
          value: code.lines.join("\n")
        });
        code = undefined;
      } else {
        flushParagraph();
        flushList();
        code = { language: (fence[1] ?? "").trim(), lines: [] };
      }
      continue;
    }

    if (code) {
      code.lines.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        value: heading[2]!
      });
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      const item = (unordered?.[1] ?? ordered?.[1] ?? "").trim();
      if (!list || list.ordered !== orderedList) {
        flushList();
        list = { ordered: orderedList, items: [] };
      }
      list.items.push(item);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (code) {
    blocks.push({
      type: "code",
      language: code.language,
      value: code.lines.join("\n")
    });
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderBlock(
  block: MarkdownBlock,
  options: MarkdownRenderOptions
): string {
  if (block.type === "heading") {
    return `<h${block.level}>${inlineMarkdownToHtml(block.value)}</h${block.level}>`;
  }

  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    const items = block.items
      .map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`)
      .join("");
    return `<${tag}>${items}</${tag}>`;
  }

  if (block.type === "code") {
    return renderCodeBlockHtml({
      code: block.value,
      language: block.language,
      ...options.code
    });
  }

  return `<p>${inlineMarkdownToHtml(block.value)}</p>`;
}
