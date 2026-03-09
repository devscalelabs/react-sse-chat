# Hono + OpenAI Chat Completions

A full-stack example with a Hono backend streaming OpenAI Chat Completions as SSE, consumed by a React frontend using `@devscalelabs/react-sse-chat`.

## Prerequisites

- Node.js >= 18
- An OpenAI API key

## Run

```bash
# From the repo root
pnpm install

# Terminal 1 — start the Hono backend
OPENAI_API_KEY=sk-... pnpm --filter cookbook-hono-openai dev:server

# Terminal 2 — start the Vite frontend (proxies /chat to localhost:8000)
pnpm --filter cookbook-hono-openai dev
```

Open `http://localhost:5173` in your browser.

## How it works

### Backend (`src/server.ts`)

- Uses `openai.chat.completions.create()` with `stream: true`
- Converts each chunk's `delta.content` into `data: {"type": "text_delta", "delta": "..."}` SSE format
- Ends the stream with `data: [DONE]`

### Frontend (`src/App.tsx`)

- Uses `useChat({ api: "/chat" })` — Vite proxies `/chat` to the Hono server
- Default event handling (no `onEvent` needed) since only `text_delta` events are emitted
