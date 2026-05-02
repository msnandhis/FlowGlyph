import {
  rawTextAdapter,
  responseTextAdapter,
  sseAdapter
} from "@flowglyph/adapters";
import type { FlowGlyphEvent } from "@flowglyph/core";
import { markdownToHtml } from "@flowglyph/markdown";
import { FlowGlyph, useFlowGlyph } from "@flowglyph/react";
import { StrictMode, useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "@flowglyph/styles/styles.css";
import "./styles.css";

function createDemoStream(text: string, charsPerSecond: number) {
  return responseTextAdapter(text, {
    id: `demo-${Date.now()}`,
    speed: {
      charsPerSecond,
      chunkSize: 4
    }
  });
}

async function* createOpenAIStream(
  message: string,
  model: string
): AsyncIterable<FlowGlyphEvent> {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, model })
  });

  yield* sseAdapter(response, { provider: "openai" });
}

function Controls() {
  const flow = useFlowGlyph();

  return (
    <div className="toolbar">
      <button type="button" onClick={() => flow.cancel()}>
        Cancel
      </button>
      <button type="button" onClick={() => void flow.retry()}>
        Retry
      </button>
    </div>
  );
}

function App() {
  const [run, setRun] = useState(0);
  const [draftMessage, setDraftMessage] = useState(
    "Explain FlowGlyph in three concise bullets."
  );
  const [submittedMessage, setSubmittedMessage] = useState(draftMessage);
  const [draftModel, setDraftModel] = useState("gpt-5.4-nano");
  const [submittedModel, setSubmittedModel] = useState(draftModel);
  const [speed, setSpeed] = useState(90);
  const [useOpenAI, setUseOpenAI] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const response = await fetch("/api/config");
      const config = (await response.json()) as { model?: string };

      if (!cancelled && config.model) {
        setDraftModel(config.model);
        setSubmittedModel(config.model);
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);
  const events = useMemo(
    () => {
      if (useOpenAI) {
        return createOpenAIStream(submittedMessage, submittedModel);
      }

      return createDemoStream(
        "### FlowGlyph\n\n- Normalizes provider streams\n- Renders partial text cleanly\n- Keeps styles optional through npm",
        speed
      );
    },
    [run, speed, submittedMessage, submittedModel, useOpenAI]
  );

  const restart = () => setRun((value) => value + 1);

  const submitOpenAI = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedMessage(draftMessage);
    setSubmittedModel(draftModel);
    setUseOpenAI(true);
    restart();
  };

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">FlowGlyph playground</p>
          <h1>Lightweight AI stream rendering</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setUseOpenAI(false);
            restart();
          }}
        >
          Restart demo
        </button>
      </section>

      <form className="prompt-panel" onSubmit={submitOpenAI}>
        <label htmlFor="message">Prompt</label>
        <textarea
          id="message"
          onChange={(event) => setDraftMessage(event.target.value)}
          rows={4}
          value={draftMessage}
        />

        <div className="form-row">
          <label htmlFor="model">Model</label>
          <input
            list="model-options"
            id="model"
            onChange={(event) => setDraftModel(event.target.value)}
            value={draftModel}
          />
          <datalist id="model-options">
            <option value="gpt-5.4-nano" />
            <option value="gpt-5.4-mini" />
            <option value="gpt-5.4" />
            <option value="gpt-5.1" />
          </datalist>
          <button type="submit">Stream OpenAI</button>
        </div>

        <div className="speed-row">
          <label htmlFor="speed">Demo speed</label>
          <input
            id="speed"
            max="180"
            min="20"
            onChange={(event) => setSpeed(Number(event.target.value))}
            step="10"
            type="range"
            value={speed}
          />
          <output htmlFor="speed">{speed} chars/s</output>
        </div>
      </form>

      <FlowGlyph
        events={events}
        key={`${useOpenAI ? "openai" : "demo"}-${run}`}
        onRetry={restart}
        renderText={(text) => (
          <span dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
        )}
      >
        <Controls />
      </FlowGlyph>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
