# Speed And Pacing

FlowGlyph supports two pacing modes.

## Normal Responses

Use `responseTextAdapter()` when your backend returns one complete value and you want it to display like a stream.

```ts
import { responseTextAdapter } from "@flowglyph/adapters";

await flow.consume(
  responseTextAdapter(response, {
    speed: { charsPerSecond: 80, chunkSize: 4 }
  })
);
```

## Live Provider Streams

Use `paceTextDeltasAdapter()` when the provider already streams, but you still want control over display speed.

```ts
import { paceTextDeltasAdapter, sseAdapter } from "@flowglyph/adapters";

await flow.consume(
  paceTextDeltasAdapter(sseAdapter(response), {
    speed: { charsPerSecond: 120, chunkSize: 4 }
  })
);
```

Pacing starts after text deltas arrive. It cannot remove initial network or model latency before the first token.

## Options

```ts
speed: "instant";
speed: { delayMs: 24, chunkSize: 4 };
speed: { charsPerSecond: 90, chunkSize: 4 };
```

`charsPerSecond` is easier for product controls. `delayMs` is useful when you want exact per-chunk timing.
