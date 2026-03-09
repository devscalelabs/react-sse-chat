import { useCallback, useRef, useState } from "react";
import { parseSSEStream } from "./sse-parser";
import type {
  EventHelpers,
  Message,
  SSEEvent,
  UseChatOptions,
  UseChatReturn,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let counter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++counter}`;
}

function createMessage(role: Message["role"], content: string): Message {
  return { id: generateId(), role, content };
}

// ---------------------------------------------------------------------------
// Default event handler — accumulates `text_delta` into the last
// assistant message.
// ---------------------------------------------------------------------------

function defaultOnEvent(event: SSEEvent, helpers: EventHelpers): void {
  if (event.type === "text_delta") {
    helpers.appendContent(event.delta);
  }
  // Other event types (e.g. tool_call) are silently ignored by default.
  // Users can provide their own `onEvent` to handle them.
}

// ---------------------------------------------------------------------------
// useChat
// ---------------------------------------------------------------------------

export function useChat(options: UseChatOptions): UseChatReturn {
  const { api, headers, body, onEvent, onMessage, onError, onFinish } =
    options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // We use a ref for the latest messages so that callbacks created inside
  // `sendMessage` always see the current value without re-creating closures.
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  // -----------------------------------------------------------------------
  // appendContent — append a text delta to the last assistant message.
  // -----------------------------------------------------------------------

  const appendContent = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== "assistant") return prev;

      const updated: Message = { ...last, content: last.content + delta };
      return [...prev.slice(0, -1), updated];
    });
  }, []);

  // -----------------------------------------------------------------------
  // stop
  // -----------------------------------------------------------------------

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  // -----------------------------------------------------------------------
  // sendMessage
  // -----------------------------------------------------------------------

  const sendMessage = useCallback(
    (text: string) => {
      // Prevent sending while already streaming.
      if (abortRef.current) {
        return;
      }

      const userMessage = createMessage("user", text);
      const assistantMessage = createMessage("assistant", "");

      setMessages((prev) => {
        const next = [...prev, userMessage, assistantMessage];
        messagesRef.current = next;
        return next;
      });

      onMessage?.(userMessage);

      setError(null);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const eventHandler = onEvent ?? defaultOnEvent;
      const helpers: EventHelpers = { appendContent, setMessages };

      // Fire-and-forget async IIFE — state is managed via React setState.
      (async () => {
        try {
          const response = await fetch(api, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify({ message: text, ...body }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(
              `SSE request failed: ${response.status} ${response.statusText}`,
            );
          }

          if (!response.body) {
            throw new Error("Response body is null — SSE streaming not supported");
          }

          for await (const event of parseSSEStream(
            response.body,
            controller.signal,
          )) {
            eventHandler(event, helpers);
          }

          // Stream finished — notify via callbacks.
          const finalMessages = messagesRef.current;
          const lastMessage = finalMessages[finalMessages.length - 1];

          if (lastMessage?.role === "assistant") {
            onMessage?.(lastMessage);
          }

          onFinish?.(finalMessages);
        } catch (err) {
          // AbortError is expected when the user calls `stop()`.
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }

          const error =
            err instanceof Error ? err : new Error(String(err));

          setError(error);
          onError?.(error);
        } finally {
          abortRef.current = null;
          setIsLoading(false);
        }
      })();
    },
    [api, headers, body, onEvent, onMessage, onError, onFinish, appendContent],
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    stop,
    setMessages,
  };
}
