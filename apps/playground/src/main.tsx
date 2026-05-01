import { rawTextAdapter, sseAdapter } from "@flowglyph/adapters";
import type { FlowGlyphEvent } from "@flowglyph/core";
import { FlowGlyph, useFlowGlyph } from "@flowglyph/react";
import { StrictMode, useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function createDemoStream(text: string) {
  async function* stream() {
    for (const token of text.split(/(\s+)/)) {
      await new Promise((resolve) => setTimeout(resolve, 32));
      yield token;
    }
  }

  return rawTextAdapter(stream(), { id: `demo-${Date.now()}` });
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
        "FlowGlyph keeps AI stream rendering focused: normalized events, a tiny core, adapters for providers, and thin framework bindings."
      );
    },
    [run, submittedMessage, submittedModel, useOpenAI]
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
      </form>

      <FlowGlyph
        events={events}
        key={`${useOpenAI ? "openai" : "demo"}-${run}`}
        onRetry={restart}
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
