# FastAPI + OpenAI Agents SDK

A minimal React chat UI that streams responses from a FastAPI backend using the [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/).

## Prerequisites

- A FastAPI server running on `http://localhost:8000` with a `POST /chat/` SSE endpoint
- Node.js >= 18

## Backend

The FastAPI endpoint should stream SSE events in this format:

```python
@chat_router.post("/")
async def generate_answer(request: ChatRequest):
    agent = Agent("Assistant", instructions="...", model="gpt-4o-mini")
    runner = Runner.run_streamed(agent, input=request.message)

    async def event_generator():
        async for event in runner.stream_events():
            if isinstance(event.data, ResponseTextDeltaEvent):
                yield f"data: {json.dumps({'type': 'text_delta', 'delta': event.data.delta})}\n\n"
            # ... tool_call events etc.

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

## Run

```bash
# From the repo root
pnpm install
pnpm --filter cookbook-fastapi-agents dev
```
