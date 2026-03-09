import { useState } from "react";
import { useChat } from "@devscalelabs/react-sse-chat";

export function App() {
  const [input, setInput] = useState("");

  const { messages, isLoading, sendMessage, stop } = useChat({
    api: "http://localhost:8000/chat/",
    body: { session_id: "1" },
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
    <div style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>FastAPI + OpenAI Agents SDK</h1>
      <p style={{ color: "#666" }}>
        Streaming chat powered by{" "}
        <code>@devscalelabs/react-sse-chat</code>
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          minHeight: 200,
          maxHeight: 500,
          overflowY: "auto",
          marginBottom: 16,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#999" }}>Send a message to start chatting.</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 6,
              background: msg.role === "user" ? "#e8f4fd" : "#f5f5f5",
            }}
          >
            <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
            <span style={{ whiteSpace: "pre-wrap" }}> {msg.content}</span>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage(input);
            setInput("");
          }
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 14,
          }}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#e74c3c",
              color: "white",
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
