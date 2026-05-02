import {
  paceTextDeltasAdapter,
  rawTextAdapter,
  responseTextAdapter,
  sseAdapter
} from "@flowglyph/adapters";
import { openAIResponsesAdapter } from "@flowglyph/adapters-openai";
import { extractCodeFences, installCodeCopy } from "@flowglyph/code";
import type { FlowGlyphEvent, FlowGlyphMode } from "@flowglyph/core";
import { markdownToHtml } from "@flowglyph/markdown";
import { FlowGlyphView, useFlowGlyphStream } from "@flowglyph/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "@flowglyph/styles/styles.css";
import "./styles.css";

type PlaygroundCase =
  | "response"
  | "markdown"
  | "tool"
  | "conversation"
  | "single"
  | "openai-normalized"
  | "openai-adapter";

type CaseConfig = {
  id: PlaygroundCase;
  title: string;
  note: string;
};

const cases: CaseConfig[] = [
  {
    id: "response",
    title: "Normal response",
    note: "Tests non-streaming API text with user-controlled pacing."
  },
  {
    id: "markdown",
    title: "Markdown + code",
    note: "Tests markdown rendering, fenced code detection, and npm styles."
  },
  {
    id: "tool",
    title: "Tool calls",
    note: "Tests status parts, tool-call state, JSON values, and completion."
  },
  {
    id: "conversation",
    title: "Conversation mode",
    note: "Keeps multiple messages in state."
  },
  {
    id: "single",
    title: "Single mode",
    note: "Keeps only the latest message for answer boxes or formatters."
  },
  {
    id: "openai-normalized",
    title: "OpenAI route",
    note: "Tests server-normalized FlowGlyph SSE from a real OpenAI stream."
  },
  {
    id: "openai-adapter",
    title: "OpenAI adapter",
    note: "Tests raw OpenAI SSE parsed in the browser by @flowglyph/adapters-openai."
  }
];

const markdownFixture = `### Markdown and code

FlowGlyph can render **basic markdown** while keeping advanced renderers optional.

- tiny escaped markdown helper
- code fences are detected separately
- CSS ships through npm

\`\`\`ts
import { responseTextAdapter } from "@flowglyph/adapters";

await flow.consume(
  responseTextAdapter("Hello from a normal API response", {
    speed: { charsPerSecond: 90 }
  })
);
\`\`\``;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* pacedEvents(
  events: FlowGlyphEvent[],
  delayMs: number
): AsyncIterable<FlowGlyphEvent> {
  for (const event of events) {
    await delay(delayMs);
    yield event;
  }
}

function createResponseDemo(speed: number) {
  return responseTextAdapter(
    "This looks like streaming, but it started as one normal API response. Use it for REST endpoints, cached answers, or providers that do not stream.",
    {
      id: `response-${Date.now()}`,
      speed: {
        charsPerSecond: speed,
        chunkSize: 4
      }
    }
  );
}

function createMarkdownDemo(speed: number) {
  return responseTextAdapter(markdownFixture, {
    id: `markdown-${Date.now()}`,
    speed: {
      charsPerSecond: speed,
      chunkSize: 8
    }
  });
}

function createToolDemo() {
  const id = `tool-${Date.now()}`;
  const statusPart = `${id}:status`;
  const toolPart = `${id}:tool`;
  const textPart = `${id}:text`;

  return pacedEvents(
    [
      { type: "message.start", messageId: id, role: "assistant" },
      {
        type: "part.start",
        messageId: id,
        partId: statusPart,
        kind: "status",
        name: "Planning tool call"
      },
      {
        type: "part.delta",
        messageId: id,
        partId: statusPart,
        delta: "Checking project status"
      },
      { type: "part.end", messageId: id, partId: statusPart },
      {
        type: "part.start",
        messageId: id,
        partId: toolPart,
        kind: "tool",
        name: "search_docs"
      },
      {
        type: "part.update",
        messageId: id,
        partId: toolPart,
        state: "streaming",
        label: "search_docs",
        value: {
          query: "FlowGlyph streaming SDK",
          limit: 3
        }
      },
      {
        type: "part.update",
        messageId: id,
        partId: toolPart,
        state: "complete",
        value: {
          query: "FlowGlyph streaming SDK",
          results: ["core", "adapters", "styles"]
        }
      },
      { type: "part.end", messageId: id, partId: toolPart },
      { type: "part.start", messageId: id, partId: textPart, kind: "text" },
      {
        type: "part.delta",
        messageId: id,
        partId: textPart,
        delta: "Tool rendering works: status, JSON payloads, and final text are separate parts."
      },
      { type: "part.end", messageId: id, partId: textPart },
      { type: "message.finish", messageId: id, status: "complete" }
    ],
    220
  );
}

async function* createConversationDemo(): AsyncIterable<FlowGlyphEvent> {
  yield* rawTextAdapter(["First answer stays in conversation mode."], {
    id: `conversation-a-${Date.now()}`
  });
  await delay(300);
  yield* rawTextAdapter(["Second answer is appended as a new message."], {
    id: `conversation-b-${Date.now()}`
  });
}

async function* createSingleDemo(): AsyncIterable<FlowGlyphEvent> {
  yield* rawTextAdapter(["This first message will be replaced."], {
    id: `single-a-${Date.now()}`
  });
  await delay(550);
  yield* rawTextAdapter(["Only this latest message remains in single mode."], {
    id: `single-b-${Date.now()}`
  });
}

async function* createOpenAINormalizedStream(
  message: string,
  model: string,
  speed: number
): AsyncIterable<FlowGlyphEvent> {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, model })
  });

  yield* paceTextDeltasAdapter(sseAdapter(response, { provider: "openai" }), {
    speed: {
      charsPerSecond: speed,
      chunkSize: 4
    }
  });
}

async function* createOpenAIAdapterStream(
  message: string,
  model: string,
  speed: number
): AsyncIterable<FlowGlyphEvent> {
  const response = await fetch("/api/openai/raw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, model })
  });

  yield* paceTextDeltasAdapter(openAIResponsesAdapter(response), {
    speed: {
      charsPerSecond: speed,
      chunkSize: 4
    }
  });
}

function getMode(activeCase: PlaygroundCase): FlowGlyphMode {
  return activeCase === "single" ? "single" : "conversation";
}

function createEvents(
  activeCase: PlaygroundCase,
  speed: number,
  message: string,
  model: string
) {
  if (activeCase === "response") return createResponseDemo(speed);
  if (activeCase === "markdown") return createMarkdownDemo(speed);
  if (activeCase === "tool") return createToolDemo();
  if (activeCase === "conversation") return createConversationDemo();
  if (activeCase === "single") return createSingleDemo();
  if (activeCase === "openai-normalized") {
    return createOpenAINormalizedStream(message, model, speed);
  }
  return createOpenAIAdapterStream(message, model, speed);
}

function usesTextSpeed(activeCase: PlaygroundCase) {
  return (
    activeCase === "response" ||
    activeCase === "markdown" ||
    activeCase === "openai-normalized" ||
    activeCase === "openai-adapter"
  );
}

function StreamSurface({
  activeCase,
  message,
  model,
  onRetry,
  speed
}: {
  activeCase: PlaygroundCase;
  message: string;
  model: string;
  onRetry: () => void;
  speed: number;
}) {
  const events = useMemo(
    () => createEvents(activeCase, speed, message, model),
    [activeCase, message, model, speed]
  );
  const { cancel, flow, retry, state } = useFlowGlyphStream({
    events,
    mode: getMode(activeCase),
    onRetry
  });
  const codeBlocks = activeCase === "markdown" ? extractCodeFences(markdownFixture) : [];

  return (
    <section className="result-panel">
      <div className="result-meta">
        <div>
          <strong>{state.status}</strong>
          <span>{state.messages.length} message(s)</span>
          <span>{getMode(activeCase)} mode</span>
          {usesTextSpeed(activeCase) ? (
            <span>{speed} chars/s applied</span>
          ) : null}
          {activeCase === "markdown" ? (
            <span>{codeBlocks.length} code block(s)</span>
          ) : null}
        </div>
        <div className="toolbar">
          <button type="button" onClick={cancel}>
            Cancel
          </button>
          <button type="button" onClick={() => void retry()}>
            Retry
          </button>
        </div>
      </div>

      <FlowGlyphView
        flow={flow}
        renderText={(text) => (
          <span
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(text, {
                code: {
                  copyButton: true
                }
              })
            }}
          />
        )}
      />
    </section>
  );
}

function App() {
  const [run, setRun] = useState(0);
  const [activeCase, setActiveCase] = useState<PlaygroundCase>("response");
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [draftMessage, setDraftMessage] = useState(
    "Explain FlowGlyph in three concise bullets."
  );
  const [submittedMessage, setSubmittedMessage] = useState(draftMessage);
  const [draftModel, setDraftModel] = useState("gpt-5.4-nano");
  const [submittedModel, setSubmittedModel] = useState(draftModel);
  const [speed, setSpeed] = useState(90);
  const [submittedSpeed, setSubmittedSpeed] = useState(speed);
  const speedInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const response = await fetch("/api/config");
      const config = (await response.json()) as {
        hasOpenAIKey?: boolean;
        model?: string;
      };

      if (!cancelled && config.model) {
        setDraftModel(config.model);
        setSubmittedModel(config.model);
      }

      if (!cancelled) {
        setHasOpenAIKey(Boolean(config.hasOpenAIKey));
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => installCodeCopy(), []);

  const readSpeedInput = () => {
    const nextSpeed = Number(speedInputRef.current?.value ?? speed);
    return Number.isFinite(nextSpeed) ? nextSpeed : speed;
  };

  const applyDraftSettings = () => {
    const nextSpeed = readSpeedInput();
    setSubmittedMessage(draftMessage);
    setSubmittedModel(draftModel);
    setSpeed(nextSpeed);
    setSubmittedSpeed(nextSpeed);
  };

  const runCase = (nextCase = activeCase) => {
    applyDraftSettings();
    setActiveCase(nextCase);
    setRun((value) => value + 1);
  };

  const runSelectedCase = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    runCase();
  };

  const runOpenAI = (nextCase: "openai-normalized" | "openai-adapter") => {
    runCase(nextCase);
  };

  const selectedCase = cases.find((item) => item.id === activeCase) ?? cases[0]!;

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">FlowGlyph playground</p>
          <h1>Test every SDK feature</h1>
        </div>
        <button type="button" onClick={() => runCase()}>
          Restart
        </button>
      </section>

      <section className="case-grid" aria-label="Feature demos">
        {cases.map((item) => (
          <button
            className={item.id === activeCase ? "case-card active" : "case-card"}
            key={item.id}
            onClick={() => {
              runCase(item.id);
            }}
            type="button"
          >
            <strong>{item.title}</strong>
            <span>{item.note}</span>
          </button>
        ))}
      </section>

      <form className="prompt-panel" onSubmit={runSelectedCase}>
        <div>
          <h2>{selectedCase.title}</h2>
          <p>{selectedCase.note}</p>
        </div>

        <div className={hasOpenAIKey ? "openai-status ready" : "openai-status"}>
          <strong>{hasOpenAIKey ? "OpenAI ready" : "OpenAI key missing"}</strong>
          <span>
            {hasOpenAIKey
              ? "Live provider routes will call the Responses API from the dev server."
              : "Add OPENAI_API_KEY to FlowGlyph/.env to run live OpenAI cases."}
          </span>
        </div>

        <label htmlFor="message">OpenAI prompt</label>
        <textarea
          id="message"
          onChange={(event) => setDraftMessage(event.target.value)}
          rows={4}
          value={draftMessage}
        />

        <div className="form-row">
          <label htmlFor="model">Model</label>
          <input
            id="model"
            list="model-options"
            onChange={(event) => setDraftModel(event.target.value)}
            value={draftModel}
          />
          <datalist id="model-options">
            <option value="gpt-5.4-nano" />
            <option value="gpt-5.4-mini" />
            <option value="gpt-5.4" />
            <option value="gpt-5.1" />
          </datalist>
          <button type="submit">Run selected test</button>
        </div>

        <div className="speed-row">
          <label htmlFor="speed">Text speed</label>
          <input
            id="speed"
            max="220"
            min="20"
            onInput={(event) => setSpeed(Number(event.currentTarget.value))}
            ref={speedInputRef}
            step="10"
            type="range"
            value={speed}
          />
          <output htmlFor="speed">{speed} chars/s</output>
        </div>

        <div className="openai-actions" aria-label="Live OpenAI runs">
          <button
            type="button"
            onClick={() => runOpenAI("openai-normalized")}
          >
            Run OpenAI route
          </button>
          <button
            type="button"
            onClick={() => runOpenAI("openai-adapter")}
          >
            Run OpenAI adapter
          </button>
        </div>
      </form>

      <StreamSurface
        activeCase={activeCase}
        key={`${activeCase}-${run}`}
        message={submittedMessage}
        model={submittedModel}
        onRetry={() => runCase()}
        speed={submittedSpeed}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <App />
);
