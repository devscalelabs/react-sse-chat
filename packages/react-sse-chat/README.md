# @devscalelabs/react-sse-chat

A lightweight React hook for consuming Server-Sent Events (SSE) from AI chat backends. Zero runtime dependencies — uses native `fetch` + `ReadableStream` under the hood.

## Install

```bash
npm install @devscalelabs/react-sse-chat
```

## Quick Start

```tsx
import { useChat } from "@devscalelabs/react-sse-chat";

function Chat() {
  const { messages, isLoading, sendMessage, stop } = useChat({
    api: "http://localhost:8000/chat/",
    body: { session_id: "3" },
  });

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      {isLoading && <button onClick={stop}>Stop</button>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
          sendMessage(input.value);
          input.value = "";
        }}
      >
        <input name="message" placeholder="Type a message..." />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

## API

### `useChat(options): UseChatReturn`

#### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `api` | `string` | Yes | SSE endpoint URL |
| `headers` | `Record<string, string>` | No | Extra headers merged into every fetch request |
| `body` | `Record<string, unknown>` | No | Extra fields merged into POST body alongside `message` |
| `onEvent` | `(event, helpers) => void` | No | Custom SSE event handler (replaces default `text_delta` handling) |
| `onMessage` | `(message) => void` | No | Called when a complete message (user or assistant) is added |
| `onError` | `(error) => void` | No | Called on fetch or stream error |
| `onFinish` | `(messages) => void` | No | Called when the stream ends |

#### Return Value

| Field | Type | Description |
|---|---|---|
| `messages` | `Message[]` | Array of `{ id, role, content }` |
| `isLoading` | `boolean` | `true` while streaming |
| `error` | `Error \| null` | Most recent error, or `null` |
| `sendMessage` | `(text: string) => void` | Send a user message and start streaming |
| `stop` | `() => void` | Abort the current stream |
| `setMessages` | `Dispatch<SetStateAction<Message[]>>` | Direct state setter for programmatic control |

## Expected SSE Format

The backend should emit events as `data: {JSON}\n\n`:

```
data: {"type": "text_delta", "delta": "Hello"}
data: {"type": "text_delta", "delta": " world"}
data: {"type": "tool_call", "tool_name": "search", "argument": "..."}
```

The stream can optionally end with:

```
data: [DONE]
```

## Custom Event Handling

By default, only `text_delta` events are processed (appended to the assistant message content). Use `onEvent` to handle additional event types:

```tsx
const { messages } = useChat({
  api: "/chat",
  onEvent: (event, helpers) => {
    switch (event.type) {
      case "text_delta":
        helpers.appendContent(event.delta);
        break;
      case "tool_call":
        // Handle tool calls however you need
        helpers.appendContent(`\n[Calling ${event.tool_name}...]\n`);
        break;
    }
  },
});
```

The `helpers` object provides:

- `appendContent(delta)` — Append text to the current assistant message
- `setMessages(setter)` — Full access to the React state setter for advanced mutations

## Standalone SSE Parser

The SSE parser is exported separately for advanced use cases:

```ts
import { parseSSEStream } from "@devscalelabs/react-sse-chat";

const response = await fetch("/stream", { method: "POST", body: "..." });

for await (const event of parseSSEStream(response.body!, signal)) {
  console.log(event);
}
```

## Types

All types are exported for use in your own code:

```ts
import type {
  Message,
  SSEEvent,
  TextDeltaEvent,
  ToolCallEvent,
  EventHelpers,
  UseChatOptions,
  UseChatReturn,
} from "@devscalelabs/react-sse-chat";
```

## Backend Example (FastAPI + OpenAI Agents SDK)

Here's a complete FastAPI backend that streams SSE events in the expected format, using the [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/):

```python
import json

from agents import Agent, RawResponsesStreamEvent, RunItemStreamEvent, Runner
from agents.extensions.memory import SQLAlchemySession
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from openai.types.responses import ResponseFunctionToolCall, ResponseTextDeltaEvent
from sqlmodel import Session

from app.models.engine import engine, get_db

chat_router = APIRouter(prefix="/chat")


@chat_router.post("/")
async def generate_answer(request: ChatRequest, db_session: Session = Depends(get_db)):
    session = SQLAlchemySession(
        session_id=request.session_id,
        engine=engine,
        create_tables=True,
    )

    agent = Agent(
        "Assistant",
        instructions="You are a helpful assistant.",
        model="gpt-4o-mini",
        tools=[],  # add your tools here
    )
    runner = Runner.run_streamed(agent, input=request.message, session=session)

    async def event_generator():
        async for event in runner.stream_events():
            if event.type == "raw_response_event" and isinstance(
                event, RawResponsesStreamEvent
            ):
                if (
                    isinstance(event.data, ResponseTextDeltaEvent)
                    and event.data.delta != ""
                ):
                    yield f"data: {json.dumps({'type': 'text_delta', 'delta': event.data.delta})}\n\n"

            elif (
                isinstance(event, RunItemStreamEvent)
                and event.name == "tool_called"
            ):
                if isinstance(event.item.raw_item, ResponseFunctionToolCall):
                    yield f"data: {json.dumps({'type': 'tool_call', 'tool_name': event.item.raw_item.name, 'argument': event.item.raw_item.arguments})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

The React frontend consuming this endpoint:

```tsx
import { useChat } from "@devscalelabs/react-sse-chat";

function Chat() {
  const { messages, isLoading, sendMessage, stop } = useChat({
    api: "http://localhost:8000/chat/",
    body: { session_id: "3" },
    onEvent: (event, helpers) => {
      switch (event.type) {
        case "text_delta":
          helpers.appendContent(event.delta);
          break;
        case "tool_call":
          helpers.appendContent(`\n[Calling ${event.tool_name}...]\n`);
          break;
      }
    },
  });

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong>
          <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
        </div>
      ))}

      {isLoading && <button onClick={stop}>Stop</button>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
          sendMessage(input.value);
          input.value = "";
        }}
      >
        <input name="message" placeholder="Type a message..." />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

## License

MIT
