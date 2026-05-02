import type { FlowGlyph, FlowGlyphMessage, FlowGlyphPart } from "./core";

export type FlowGlyphDOMRenderer = {
  attach: (flow: FlowGlyph) => () => void;
  render: (messages: FlowGlyphMessage[]) => void;
  destroy: () => void;
};

export type DOMRendererOptions = {
  classPrefix?: string;
};

export function createDOMRenderer(
  target: string | HTMLElement,
  options: DOMRendererOptions = {}
): FlowGlyphDOMRenderer {
  const root = resolveTarget(target);
  const classPrefix = options.classPrefix ?? "fg";
  const messageNodes = new Map<string, HTMLElement>();
  const partNodes = new Map<string, HTMLElement>();
  let frame = 0;
  let pendingMessages: FlowGlyphMessage[] = [];

  const renderNow = () => {
    frame = 0;
    root.dataset.flowglyphMounted = "true";
    reconcileMessages(root, pendingMessages, messageNodes, partNodes, classPrefix);
  };

  const render = (messages: FlowGlyphMessage[]) => {
    pendingMessages = messages;

    if (frame === 0) {
      frame = requestAnimationFrame(renderNow);
    }
  };

  return {
    attach(flow) {
      return flow.subscribe((state) => render(state.messages));
    },

    render,

    destroy() {
      if (frame !== 0) cancelAnimationFrame(frame);
      root.textContent = "";
      messageNodes.clear();
      partNodes.clear();
    }
  };
}

function reconcileMessages(
  root: HTMLElement,
  messages: FlowGlyphMessage[],
  messageNodes: Map<string, HTMLElement>,
  partNodes: Map<string, HTMLElement>,
  classPrefix: string
) {
  const seenMessages = new Set<string>();

  for (const message of messages) {
    seenMessages.add(message.id);
    const messageNode = getOrCreateMessageNode(
      root,
      message,
      messageNodes,
      classPrefix
    );
    messageNode.dataset.flowglyphStatus = message.status;
    reconcileParts(messageNode, message.parts, partNodes, classPrefix);

    if (message.error) {
      const errorNode = getOrCreateChild(
        messageNode,
        `${message.id}:error`,
        `${classPrefix}-error`
      );
      errorNode.textContent = message.error.message;
    }
  }

  for (const [id, node] of messageNodes) {
    if (!seenMessages.has(id)) {
      node.remove();
      messageNodes.delete(id);
    }
  }
}

function reconcileParts(
  messageNode: HTMLElement,
  parts: FlowGlyphPart[],
  partNodes: Map<string, HTMLElement>,
  classPrefix: string
) {
  const seenParts = new Set<string>();

  for (const part of parts) {
    seenParts.add(part.id);
    const partNode = getOrCreatePartNode(messageNode, part, partNodes, classPrefix);
    partNode.dataset.flowglyphPartKind = part.kind;
    partNode.dataset.flowglyphPartState = part.state;

    if (part.kind === "tool") {
      renderToolPart(partNode, part);
    } else {
      partNode.textContent = renderPartText(part);
    }
  }

  for (const [id, node] of partNodes) {
    if (!seenParts.has(id) && node.parentElement === messageNode) {
      node.remove();
      partNodes.delete(id);
    }
  }
}

function getOrCreateMessageNode(
  root: HTMLElement,
  message: FlowGlyphMessage,
  messageNodes: Map<string, HTMLElement>,
  classPrefix: string
) {
  const existing = messageNodes.get(message.id);
  if (existing) return existing;

  const node = document.createElement("article");
  node.className = `${classPrefix}-message ${classPrefix}-message-${message.role}`;
  node.dataset.flowglyphMessageId = message.id;
  messageNodes.set(message.id, node);
  root.append(node);
  return node;
}

function getOrCreatePartNode(
  messageNode: HTMLElement,
  part: FlowGlyphPart,
  partNodes: Map<string, HTMLElement>,
  classPrefix: string
) {
  const existing = partNodes.get(part.id);
  if (existing) return existing;

  const node =
    part.kind === "text" || part.kind === "reasoning"
      ? document.createElement("span")
      : part.kind === "tool"
        ? document.createElement("details")
      : document.createElement("div");
  node.className = `${classPrefix}-part ${classPrefix}-${part.kind}`;
  node.dataset.flowglyphPartId = part.id;
  partNodes.set(part.id, node);
  messageNode.append(node);
  return node;
}

function getOrCreateChild(
  root: HTMLElement,
  id: string,
  className: string
) {
  const selector = `[data-flowglyph-child-id="${CSS.escape(id)}"]`;
  const existing = root.querySelector<HTMLElement>(selector);
  if (existing) return existing;

  const node = document.createElement("div");
  node.className = className;
  node.dataset.flowglyphChildId = id;
  root.append(node);
  return node;
}

function renderPartText(part: FlowGlyphPart) {
  if (part.kind === "status") return part.label ?? "";
  if (part.text) return part.text;
  if (typeof part.value === "string") return part.value;
  if (part.value === undefined) return "";
  return JSON.stringify(part.value, null, 2);
}

function renderToolPart(node: HTMLElement, part: FlowGlyphPart) {
  node.textContent = "";
  if (node instanceof HTMLDetailsElement) {
    node.open = part.state !== "complete";
  }

  const summary = document.createElement("summary");
  summary.textContent = part.label ?? part.name ?? "Tool call";
  node.append(summary);

  if (part.value === undefined) return;

  const body = document.createElement("pre");
  body.textContent =
    typeof part.value === "string"
      ? part.value
      : JSON.stringify(part.value, null, 2);
  node.append(body);
}

function resolveTarget(target: string | HTMLElement) {
  if (typeof target !== "string") return target;

  const element = document.querySelector<HTMLElement>(target);

  if (!element) {
    throw new Error(`FlowGlyph target not found: ${target}`);
  }

  return element;
}
