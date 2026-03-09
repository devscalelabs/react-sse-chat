# @devscalelabs/react-sse-chat

A lightweight React hook for consuming Server-Sent Events (SSE) from AI chat backends. Zero dependencies.

## Install

```bash
pnpm add @devscalelabs/react-sse-chat
```

## Quick Start

```tsx
import { useChat } from "@devscalelabs/react-sse-chat";

function Chat() {
  const { messages, isLoading, sendMessage, stop } = useChat({
    api: "http://localhost:8000/chat/",
  });

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong>
          {msg.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return <span key={i}>{part.text}</span>;
              case "tool_call":
                return (
                  <pre key={i} style={{ opacity: 0.7, fontSize: "0.85em" }}>
                    [Tool: {part.tool_name}]{"\n"}
                    {JSON.stringify(JSON.parse(part.argument), null, 2)}
                  </pre>
                );
              default:
                return null;
            }
          })}
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

## Documentation

Full docs, API reference, and cookbook examples at **[react-sse-chat.devscalelabs.com](https://react-sse-chat.devscalelabs.com)**.

## License

MIT
