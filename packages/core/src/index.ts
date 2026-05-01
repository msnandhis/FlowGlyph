export type FlowGlyphRole = "assistant" | "user" | "system";

export type FlowGlyphStatus =
  | "idle"
  | "streaming"
  | "complete"
  | "aborted"
  | "error";

export type FlowGlyphPartKind =
  | "text"
  | "reasoning"
  | "tool"
  | "data"
  | "source"
  | "file"
  | "status";

export type FlowGlyphPartState =
  | "pending"
  | "streaming"
  | "complete"
  | "error"
  | "aborted";

export type FlowGlyphError = {
  message: string;
  code?: string | undefined;
  cause?: unknown;
};

export type FlowGlyphEvent =
  | {
      type: "message.start";
      messageId: string;
      role?: FlowGlyphRole;
      metadata?: unknown;
    }
  | {
      type: "part.start";
      messageId: string;
      partId: string;
      kind: FlowGlyphPartKind;
      name?: string;
      index?: number;
      metadata?: unknown;
    }
  | {
      type: "part.delta";
      messageId: string;
      partId: string;
      delta: string | unknown;
      format?: "text" | "json-text" | "patch";
    }
  | {
      type: "part.update";
      messageId: string;
      partId: string;
      state?: FlowGlyphPartState;
      value?: unknown;
      label?: string;
    }
  | {
      type: "part.end";
      messageId: string;
      partId: string;
    }
  | {
      type: "step.start";
      messageId: string;
      stepId?: string;
    }
  | {
      type: "step.finish";
      messageId: string;
      stepId?: string;
      usage?: unknown;
    }
  | {
      type: "message.finish";
      messageId: string;
      status: Exclude<FlowGlyphStatus, "idle" | "streaming">;
      reason?: string;
      usage?: unknown;
    }
  | {
      type: "error";
      messageId?: string;
      partId?: string;
      error: FlowGlyphError;
      recoverable?: boolean;
    }
  | {
      type: "unknown";
      provider?: string;
      raw: unknown;
    };

export type FlowGlyphPart = {
  id: string;
  kind: FlowGlyphPartKind;
  state: FlowGlyphPartState;
  name?: string | undefined;
  text?: string | undefined;
  label?: string | undefined;
  value?: unknown;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export type FlowGlyphMessage = {
  id: string;
  role: FlowGlyphRole;
  status: FlowGlyphStatus;
  parts: FlowGlyphPart[];
  error?: FlowGlyphError | undefined;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export type FlowGlyphState = {
  status: FlowGlyphStatus;
  messages: FlowGlyphMessage[];
  activeMessageId?: string | undefined;
  error?: FlowGlyphError | undefined;
  updatedAt: number;
};

export type FlowGlyphStateListener = (state: FlowGlyphState) => void;

export type FlowGlyphListenerMap = {
  event: FlowGlyphEvent;
  state: FlowGlyphState;
  error: FlowGlyphError;
  cancel: undefined;
  retry: undefined;
};

export type FlowGlyphEventName = keyof FlowGlyphListenerMap;

export type FlowGlyphListener<T extends FlowGlyphEventName> = (
  payload: FlowGlyphListenerMap[T]
) => void;

export type FlowGlyphPluginAPI = {
  on: FlowGlyph["on"];
  off: FlowGlyph["off"];
  emit: FlowGlyph["emit"];
  getState: FlowGlyph["getState"];
  subscribe: FlowGlyph["subscribe"];
  dispatch: (event: FlowGlyphEvent) => void;
};

export type FlowGlyphPlugin = {
  name: string;
  version?: string;
  setup: (api: FlowGlyphPluginAPI) => void | (() => void);
};

export type FlowGlyphOptions = {
  onRetry?: (() => void | Promise<void>) | undefined;
  now?: (() => number) | undefined;
};

export type FlowGlyph = {
  use: (plugin: FlowGlyphPlugin) => () => void;
  on: <T extends FlowGlyphEventName>(
    name: T,
    listener: FlowGlyphListener<T>
  ) => () => void;
  off: <T extends FlowGlyphEventName>(
    name: T,
    listener: FlowGlyphListener<T>
  ) => void;
  emit: <T extends FlowGlyphEventName>(
    name: T,
    payload: FlowGlyphListenerMap[T]
  ) => void;
  consume: (
    events: AsyncIterable<FlowGlyphEvent> | Iterable<FlowGlyphEvent>
  ) => Promise<void>;
  dispatch: (event: FlowGlyphEvent) => void;
  cancel: () => void;
  retry: () => Promise<void>;
  getState: () => FlowGlyphState;
  subscribe: (listener: FlowGlyphStateListener) => () => void;
};

type ListenerSet = Set<(payload: unknown) => void>;

const textLikeKinds = new Set<FlowGlyphPartKind>(["text", "reasoning"]);

export function createFlowGlyph(options: FlowGlyphOptions = {}): FlowGlyph {
  const now = options.now ?? Date.now;
  const listeners = new Map<FlowGlyphEventName, ListenerSet>();
  const stateListeners = new Set<FlowGlyphStateListener>();
  const pluginCleanups = new Map<string, () => void>();
  let cancelled = false;
  let state = createInitialState(now());

  const notify = () => {
    for (const listener of stateListeners) listener(state);
    emit("state", state);
  };

  const updateState = (nextState: FlowGlyphState) => {
    state = nextState;
    notify();
  };

  const dispatch = (event: FlowGlyphEvent) => {
    emit("event", event);
    updateState(reduceState(state, event, now()));
  };

  const api: FlowGlyphPluginAPI = {
    on,
    off,
    emit,
    getState,
    subscribe,
    dispatch
  };

  function on<T extends FlowGlyphEventName>(
    name: T,
    listener: FlowGlyphListener<T>
  ) {
    const bucket = listeners.get(name) ?? new Set();
    bucket.add(listener as (payload: unknown) => void);
    listeners.set(name, bucket);

    return () => off(name, listener);
  }

  function off<T extends FlowGlyphEventName>(
    name: T,
    listener: FlowGlyphListener<T>
  ) {
    listeners.get(name)?.delete(listener as (payload: unknown) => void);
  }

  function emit<T extends FlowGlyphEventName>(
    name: T,
    payload: FlowGlyphListenerMap[T]
  ) {
    for (const listener of listeners.get(name) ?? []) {
      listener(payload);
    }
  }

  function getState() {
    return state;
  }

  function subscribe(listener: FlowGlyphStateListener) {
    stateListeners.add(listener);
    listener(state);

    return () => {
      stateListeners.delete(listener);
    };
  }

  return {
    use(plugin) {
      pluginCleanups.get(plugin.name)?.();
      const cleanup = plugin.setup(api) ?? (() => undefined);
      pluginCleanups.set(plugin.name, cleanup);

      return () => {
        pluginCleanups.get(plugin.name)?.();
        pluginCleanups.delete(plugin.name);
      };
    },

    on,
    off,
    emit,

    async consume(events) {
      cancelled = false;
      state = { ...state, status: "streaming", updatedAt: now() };
      notify();

      try {
        for await (const event of events) {
          if (cancelled) break;
          dispatch(event);
        }

        if (cancelled) {
          updateState(finishActiveMessage(state, "aborted", now()));
        } else if (state.status === "streaming") {
          updateState({ ...state, status: "complete", updatedAt: now() });
        }
      } catch (cause) {
        const error = toFlowGlyphError(cause);
        emit("error", error);
        updateState({
          ...finishActiveMessage(state, "error", now(), error),
          error
        });
      }
    },

    dispatch,

    cancel() {
      cancelled = true;
      emit("cancel", undefined);
      updateState(finishActiveMessage(state, "aborted", now()));
    },

    async retry() {
      emit("retry", undefined);
      await options.onRetry?.();
    },

    getState,
    subscribe
  };
}

function createInitialState(updatedAt: number): FlowGlyphState {
  return {
    status: "idle",
    messages: [],
    updatedAt
  };
}

function reduceState(
  state: FlowGlyphState,
  event: FlowGlyphEvent,
  timestamp: number
): FlowGlyphState {
  if (event.type === "unknown") {
    return { ...state, updatedAt: timestamp };
  }

  if (event.type === "message.start") {
    const existingIndex = state.messages.findIndex(
      (message) => message.id === event.messageId
    );
    const message: FlowGlyphMessage = {
      id: event.messageId,
      role: event.role ?? "assistant",
      status: "streaming",
      parts: [],
      metadata: event.metadata,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const messages =
      existingIndex >= 0
        ? replaceAt(state.messages, existingIndex, {
            ...state.messages[existingIndex]!,
            ...message,
            createdAt: state.messages[existingIndex]!.createdAt
          })
        : [...state.messages, message];

    return {
      ...state,
      status: "streaming",
      activeMessageId: event.messageId,
      messages,
      updatedAt: timestamp
    };
  }

  const messageId =
    "messageId" in event ? event.messageId : state.activeMessageId;

  if (!messageId) {
    return { ...state, updatedAt: timestamp };
  }

  if (event.type === "message.finish") {
    return finishMessage(state, messageId, event.status, timestamp);
  }

  if (event.type === "error") {
    return applyError(state, event, timestamp);
  }

  return updateMessage(state, messageId, timestamp, (message) => {
    if (event.type === "part.start") {
      const part: FlowGlyphPart = {
        id: event.partId,
        kind: event.kind,
        state: "streaming",
        name: event.name,
        metadata: event.metadata,
        text: textLikeKinds.has(event.kind) ? "" : undefined,
        label: event.kind === "status" ? event.name : undefined,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const parts = insertPart(message.parts, part, event.index);

      return { ...message, status: "streaming", parts };
    }

    if (event.type === "part.delta") {
      return {
        ...message,
        parts: message.parts.map((part) => {
          if (part.id !== event.partId) return part;
          const delta =
            typeof event.delta === "string" ? event.delta : undefined;

          if (textLikeKinds.has(part.kind) || part.kind === "status") {
            return {
              ...part,
              text:
                part.kind === "status"
                  ? part.text
                  : `${part.text ?? ""}${delta ?? ""}`,
              label:
                part.kind === "status"
                  ? `${part.label ?? ""}${delta ?? ""}`
                  : part.label,
              value: delta === undefined ? event.delta : part.value,
              updatedAt: timestamp
            };
          }

          return {
            ...part,
            value: delta === undefined ? event.delta : `${String(part.value ?? "")}${delta}`,
            updatedAt: timestamp
          };
        })
      };
    }

    if (event.type === "part.update") {
      return {
        ...message,
        parts: message.parts.map((part) =>
          part.id === event.partId
            ? {
                ...part,
                state: event.state ?? part.state,
                value: event.value ?? part.value,
                label: event.label ?? part.label,
                updatedAt: timestamp
              }
            : part
        )
      };
    }

    if (event.type === "part.end") {
      return {
        ...message,
        parts: message.parts.map((part) =>
          part.id === event.partId
            ? { ...part, state: "complete", updatedAt: timestamp }
            : part
        )
      };
    }

    return message;
  });
}

function insertPart(
  parts: FlowGlyphPart[],
  part: FlowGlyphPart,
  index?: number
) {
  const existingIndex = parts.findIndex((item) => item.id === part.id);

  if (existingIndex >= 0) {
    return replaceAt(parts, existingIndex, {
      ...parts[existingIndex]!,
      ...part,
      createdAt: parts[existingIndex]!.createdAt
    });
  }

  if (typeof index !== "number" || index < 0 || index >= parts.length) {
    return [...parts, part];
  }

  return [...parts.slice(0, index), part, ...parts.slice(index)];
}

function updateMessage(
  state: FlowGlyphState,
  messageId: string,
  timestamp: number,
  updater: (message: FlowGlyphMessage) => FlowGlyphMessage
): FlowGlyphState {
  const index = state.messages.findIndex((message) => message.id === messageId);
  const message =
    index >= 0
      ? state.messages[index]!
      : {
          id: messageId,
          role: "assistant" as const,
          status: "streaming" as const,
          parts: [],
          createdAt: timestamp,
          updatedAt: timestamp
        };
  const nextMessage = { ...updater(message), updatedAt: timestamp };
  const messages =
    index >= 0
      ? replaceAt(state.messages, index, nextMessage)
      : [...state.messages, nextMessage];

  return {
    ...state,
    status: state.status === "idle" ? "streaming" : state.status,
    activeMessageId: messageId,
    messages,
    updatedAt: timestamp
  };
}

function finishMessage(
  state: FlowGlyphState,
  messageId: string,
  status: Exclude<FlowGlyphStatus, "idle" | "streaming">,
  timestamp: number,
  error?: FlowGlyphError
): FlowGlyphState {
  const nextState = updateMessage(state, messageId, timestamp, (message) => ({
    ...message,
    status,
    error,
    parts: message.parts.map((part) =>
      part.state === "streaming"
        ? { ...part, state: status === "complete" ? "complete" : status, updatedAt: timestamp }
        : part
    )
  }));

  return {
    ...nextState,
    status,
    activeMessageId:
      state.activeMessageId === messageId ? undefined : state.activeMessageId
  };
}

function finishActiveMessage(
  state: FlowGlyphState,
  status: Exclude<FlowGlyphStatus, "idle" | "streaming">,
  timestamp: number,
  error?: FlowGlyphError
): FlowGlyphState {
  if (!state.activeMessageId) {
    return { ...state, status, error, updatedAt: timestamp };
  }

  return finishMessage(state, state.activeMessageId, status, timestamp, error);
}

function applyError(
  state: FlowGlyphState,
  event: Extract<FlowGlyphEvent, { type: "error" }>,
  timestamp: number
): FlowGlyphState {
  if (!event.messageId) {
    return { ...state, status: "error", error: event.error, updatedAt: timestamp };
  }

  return finishMessage(state, event.messageId, "error", timestamp, event.error);
}

function toFlowGlyphError(cause: unknown): FlowGlyphError {
  if (cause instanceof Error) {
    return {
      message: cause.message,
      cause
    };
  }

  return {
    message: String(cause),
    cause
  };
}

function replaceAt<T>(items: T[], index: number, value: T): T[] {
  return [...items.slice(0, index), value, ...items.slice(index + 1)];
}
