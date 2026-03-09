# @devscaleid/react-sse

## Overview

A lightweight React hook for consuming Server-Sent Events (SSE) from AI chat backends. Manages message state, streaming, and abort — no heavy SDK needed.

## Scope

- React hook only (`useChat`)
- Follows the `text_delta` / `tool_call` SSE event pattern
- Uses `@microsoft/fetch-event-source` under the hood for POST-based SSE
- Zero config for simple cases, customizable for advanced ones

## API Design

```tsx
import { useChat } from "@devscaleid/react-sse";

const { messages, isLoading, sendMessage, stop } = useChat({
  api: "http://localhost:8000/chat/",
  body: { session_id: "3" },
});
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `api` | `string` | yes | SSE endpoint URL |
| `body` | `Record<string, unknown>` | no | Extra fields merged into POST body alongside `message` |

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `Message[]` | Array of `{ id, role, content }` |
| `isLoading` | `boolean` | `true` while streaming |
| `sendMessage` | `(text: string) => void` | Send a user message and start streaming |
| `stop` | `() => void` | Abort the current stream |

### Expected SSE Event Format

The backend should emit SSE events with `data: {JSON}\n\n` format:

```
data: {"type": "text_delta", "delta": "Hello"}
data: {"type": "tool_call", "tool_name": "search_web", "argument": "..."}
```

### Message Type

```ts
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}
```

## Tasks

1. [ ] Init project with `package.json`, `tsconfig.json`
2. [ ] Install dependencies: `react` (peer), `@microsoft/fetch-event-source`
3. [ ] Implement `src/use-chat.ts` — the hook
4. [ ] Implement `src/index.ts` — barrel export
5. [ ] Configure build with `tsup` (ESM + CJS + .d.ts)
6. [ ] Verify build output
7. [ ] Add README.md with install + usage instructions
8. [ ] Publish to npm under `@devscaleid/react-sse`
