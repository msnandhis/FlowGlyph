import {
  createFlowGlyph,
  type FlowGlyph,
  type FlowGlyphEvent,
  type FlowGlyphMessage,
  type FlowGlyphMode,
  type FlowGlyphPart,
  type FlowGlyphPlugin,
  type FlowGlyphState
} from "./core";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from "react";

export type FlowGlyphProviderProps = {
  children: ReactNode;
  events?: AsyncIterable<FlowGlyphEvent> | Iterable<FlowGlyphEvent>;
  plugins?: FlowGlyphPlugin[];
  onRetry?: () => void | Promise<void>;
  mode?: FlowGlyphMode;
};

const FlowGlyphContext = createContext<FlowGlyph | null>(null);

export function FlowGlyphProvider({
  children,
  events,
  plugins = [],
  onRetry,
  mode
}: FlowGlyphProviderProps) {
  const flow = useMemo(() => createFlowGlyph({ onRetry, mode }), [mode, onRetry]);
  const pluginNames = plugins.map((plugin) => plugin.name).join("\u0000");

  useEffect(() => {
    const cleanups = plugins.map((plugin) => flow.use(plugin));
    return () => {
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [flow, pluginNames]);

  useEffect(() => {
    if (!events) return;

    void flow.consume(events);

    return () => {
      flow.cancel();
    };
  }, [flow, events]);

  return createElement(FlowGlyphContext.Provider, { value: flow }, children);
}

export function useFlowGlyph(): FlowGlyph {
  const flow = useContext(FlowGlyphContext);

  if (!flow) {
    throw new Error("useFlowGlyph must be used within a FlowGlyphProvider.");
  }

  return flow;
}

export function useFlowGlyphState(flow?: FlowGlyph): FlowGlyphState {
  const contextFlow = useContext(FlowGlyphContext);
  const activeFlow = flow ?? contextFlow;

  if (!activeFlow) {
    throw new Error("useFlowGlyphState requires a FlowGlyph instance or provider.");
  }

  return useSyncExternalStore(
    activeFlow.subscribe,
    activeFlow.getState,
    activeFlow.getState
  );
}

export type UseFlowGlyphStreamOptions = {
  events?: AsyncIterable<FlowGlyphEvent> | Iterable<FlowGlyphEvent>;
  plugins?: FlowGlyphPlugin[];
  onRetry?: () => void | Promise<void>;
  mode?: FlowGlyphMode;
};

export function useFlowGlyphStream({
  events,
  plugins = [],
  onRetry,
  mode
}: UseFlowGlyphStreamOptions = {}) {
  const flow = useMemo(() => createFlowGlyph({ onRetry, mode }), [mode, onRetry]);
  const state = useFlowGlyphState(flow);
  const pluginNames = plugins.map((plugin) => plugin.name).join("\u0000");

  useEffect(() => {
    const cleanups = plugins.map((plugin) => flow.use(plugin));
    return () => {
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [flow, pluginNames]);

  useEffect(() => {
    if (!events) return;

    void flow.consume(events);

    return () => {
      flow.cancel();
    };
  }, [events, flow]);

  const consume = useCallback(
    (nextEvents: AsyncIterable<FlowGlyphEvent> | Iterable<FlowGlyphEvent>) =>
      flow.consume(nextEvents),
    [flow]
  );

  return {
    flow,
    state,
    consume,
    cancel: flow.cancel,
    retry: flow.retry
  };
}

export type FlowGlyphRenderPart = (
  part: FlowGlyphPart,
  message: FlowGlyphMessage
) => ReactNode;

export type FlowGlyphRenderText = (
  text: string,
  part: FlowGlyphPart,
  message: FlowGlyphMessage
) => ReactNode;

export type FlowGlyphViewProps = {
  flow?: FlowGlyph;
  className?: string | undefined;
  renderPart?: FlowGlyphRenderPart | undefined;
  renderText?: FlowGlyphRenderText | undefined;
};

export function FlowGlyphView({
  flow,
  className = "fg-root",
  renderPart,
  renderText
}: FlowGlyphViewProps) {
  const state = useFlowGlyphState(flow);

  return (
    <div className={className} data-flowglyph-status={state.status}>
      {state.messages.map((message) => (
        <article
          className={`fg-message fg-message-${message.role}`}
          data-flowglyph-message-status={message.status}
          key={message.id}
        >
          {message.parts.map((part) => {
            const customPart = renderPart?.(part, message);
            if (customPart !== undefined && customPart !== null) {
              return createElement(
                "span",
                { "data-flowglyph-custom-part": part.id, key: part.id },
                customPart
              );
            }

            if (part.kind === "text" || part.kind === "reasoning") {
              const TextTag = renderText ? "div" : "span";
              return (
                <TextTag
                  className={`fg-part fg-${part.kind}`}
                  data-flowglyph-part-state={part.state}
                  key={part.id}
                >
                  {renderText
                    ? renderText(part.text ?? "", part, message)
                    : part.text}
                </TextTag>
              );
            }

            if (part.kind === "status") {
              return (
                <div
                  className="fg-part fg-status"
                  data-flowglyph-state={part.state}
                  key={part.id}
                >
                  {part.label}
                </div>
              );
            }

            if (part.kind === "tool") {
              return (
                <details
                  className="fg-part fg-tool"
                  data-flowglyph-part-state={part.state}
                  key={part.id}
                  open={part.state !== "complete"}
                >
                  <summary>{part.label ?? part.name ?? "Tool call"}</summary>
                  {part.value === undefined ? null : (
                    <pre>
                      {typeof part.value === "string"
                        ? part.value
                        : JSON.stringify(part.value, null, 2)}
                    </pre>
                  )}
                </details>
              );
            }

            return (
              <div
                className={`fg-part fg-${part.kind}`}
                data-flowglyph-part-state={part.state}
                key={part.id}
              >
                {typeof part.value === "string"
                  ? part.value
                  : part.value === undefined
                    ? null
                    : JSON.stringify(part.value, null, 2)}
              </div>
            );
          })}
          {message.error ? (
            <div className="fg-error">{message.error.message}</div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export type FlowGlyphComponentProps = FlowGlyphProviderProps & FlowGlyphViewProps;

export function FlowGlyphComponent({
  children,
  className,
  flow,
  events,
  plugins,
  onRetry,
  mode,
  renderPart,
  renderText
}: FlowGlyphComponentProps) {
  const ownedFlowRef = useRef<FlowGlyph | null>(null);

  if (!flow && !ownedFlowRef.current) {
    ownedFlowRef.current = createFlowGlyph({ onRetry, mode });
  }

  const activeFlow = flow ?? ownedFlowRef.current!;

  useEffect(() => {
    if (!events) return;

    void activeFlow.consume(events);

    return () => {
      activeFlow.cancel();
    };
  }, [activeFlow, events]);

  useEffect(() => {
    const cleanups = (plugins ?? []).map((plugin) => activeFlow.use(plugin));
    return () => {
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [activeFlow, plugins?.map((plugin) => plugin.name).join("\u0000")]);

  return (
    <FlowGlyphContext.Provider value={activeFlow}>
      {children}
      <FlowGlyphView
        className={className}
        flow={activeFlow}
        renderPart={renderPart}
        renderText={renderText}
      />
    </FlowGlyphContext.Provider>
  );
}

export { FlowGlyphComponent as FlowGlyph };
