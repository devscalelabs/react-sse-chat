import type { Dispatch, SetStateAction } from "react";

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// SSE Events
// ---------------------------------------------------------------------------

export interface TextDeltaEvent {
  type: "text_delta";
  delta: string;
}

export interface ToolCallEvent {
  type: "tool_call";
  tool_name: string;
  argument: string;
}

export type SSEEvent = TextDeltaEvent | ToolCallEvent;

// ---------------------------------------------------------------------------
// Event Helpers — passed to the `onEvent` callback so consumers can
// mutate message state from within their handler.
// ---------------------------------------------------------------------------

export interface EventHelpers {
  /** Append a string to the current assistant message's content. */
  appendContent: (delta: string) => void;

  /** Direct access to the messages state setter for advanced use-cases. */
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

// ---------------------------------------------------------------------------
// Hook Options
// ---------------------------------------------------------------------------

export interface UseChatOptions {
  /** SSE endpoint URL. */
  api: string;

  /** Extra headers merged into every fetch request. */
  headers?: Record<string, string>;

  /** Extra fields merged into the POST body alongside `message`. */
  body?: Record<string, unknown>;

  /**
   * Custom handler for each SSE event. When provided, this **replaces** the
   * default `text_delta` handling — giving you full control over how events
   * are mapped to message state.
   */
  onEvent?: (event: SSEEvent, helpers: EventHelpers) => void;

  /** Called when the assistant message is complete (stream ended). */
  onFinish?: (messages: Message[]) => void;

  /** Called whenever a new complete message (user or assistant) is added. */
  onMessage?: (message: Message) => void;

  /** Called when a fetch or stream error occurs. */
  onError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Hook Return
// ---------------------------------------------------------------------------

export interface UseChatReturn {
  /** Chronological list of messages in the conversation. */
  messages: Message[];

  /** `true` while the assistant is streaming a response. */
  isLoading: boolean;

  /** The most recent error, or `null`. */
  error: Error | null;

  /** Send a user message and begin streaming the assistant response. */
  sendMessage: (text: string) => void;

  /** Abort the current stream. */
  stop: () => void;

  /** Direct setter for programmatic message manipulation (clear, prepopulate, etc.). */
  setMessages: Dispatch<SetStateAction<Message[]>>;
}
