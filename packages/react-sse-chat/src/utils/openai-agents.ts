import type { TextPart, ToolCallPart, Message } from "../types";

// ---------------------------------------------------------------------------
// Part Types — OpenAI Agents-specific content parts
// ---------------------------------------------------------------------------

export interface ReasoningPart {
  type: "reasoning";
  text: string;
}

export interface ToolResultPart {
  type: "tool_result";
  callId: string;
  output: string;
}

/** Union of all content parts the OpenAI Agents converter can produce. */
export type OpenAIAgentsContentPart =
  | TextPart
  | ToolCallPart
  | ReasoningPart
  | ToolResultPart;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ConvertOpenAIAgentsOptions {
  /** Include reasoning items as `ReasoningPart` in the output. Defaults to `false`. */
  includeReasoning?: boolean;
}

// ---------------------------------------------------------------------------
// ID Generation (local to avoid coupling to use-chat.ts internals)
// ---------------------------------------------------------------------------

let counter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++counter}`;
}

// ---------------------------------------------------------------------------
// Type Guards — inspect the shape of raw OpenAI Agents SDK items
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserMessage(item: Record<string, unknown>): boolean {
  return item.role === "user" && typeof item.content === "string";
}

function isReasoningItem(item: Record<string, unknown>): boolean {
  return item.type === "reasoning" && Array.isArray(item.content);
}

function isAssistantMessage(item: Record<string, unknown>): boolean {
  return (
    item.type === "message" &&
    item.role === "assistant" &&
    Array.isArray(item.content)
  );
}

function isFunctionCall(item: Record<string, unknown>): boolean {
  return (
    item.type === "function_call" &&
    typeof item.name === "string" &&
    typeof item.arguments === "string"
  );
}

function isFunctionCallOutput(item: Record<string, unknown>): boolean {
  return item.type === "function_call_output" && typeof item.output === "string";
}

// ---------------------------------------------------------------------------
// Converter
// ---------------------------------------------------------------------------

/**
 * Convert an array of OpenAI Agents SDK message items into the
 * `Message<OpenAIAgentsContentPart>[]` format used by `useChat`.
 *
 * Consecutive assistant-side items (reasoning, text output, tool calls,
 * tool results) are merged into a single `Message` with multiple parts.
 * A new user message always starts a fresh message boundary.
 *
 * @example
 * ```ts
 * const messages = convertOpenAIAgentsMessages(agentData);
 * const { sendMessage } = useChat({ api: "/chat", initialMessages: messages });
 * ```
 */
export function convertOpenAIAgentsMessages(
  items: unknown[],
  options?: ConvertOpenAIAgentsOptions,
): Message<OpenAIAgentsContentPart>[] {
  const { includeReasoning = false } = options ?? {};
  const messages: Message<OpenAIAgentsContentPart>[] = [];

  /** Get the current (last) assistant message, or create one. */
  function getOrCreateAssistantMessage(): Message<OpenAIAgentsContentPart> {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant") {
      return last;
    }
    const msg: Message<OpenAIAgentsContentPart> = {
      id: generateId(),
      role: "assistant",
      parts: [],
    };
    messages.push(msg);
    return msg;
  }

  for (const raw of items) {
    if (!isRecord(raw)) continue;

    // --- User message ---
    if (isUserMessage(raw)) {
      messages.push({
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: raw.content as string }],
      });
      continue;
    }

    // --- Reasoning ---
    if (isReasoningItem(raw)) {
      if (!includeReasoning) continue;

      const assistantMsg = getOrCreateAssistantMessage();
      const contentItems = raw.content as Record<string, unknown>[];

      for (const entry of contentItems) {
        if (isRecord(entry) && entry.type === "reasoning_text" && typeof entry.text === "string") {
          assistantMsg.parts.push({
            type: "reasoning",
            text: entry.text,
          });
        }
      }
      continue;
    }

    // --- Assistant message (output_text) ---
    if (isAssistantMessage(raw)) {
      const assistantMsg = getOrCreateAssistantMessage();
      const contentItems = raw.content as Record<string, unknown>[];

      for (const entry of contentItems) {
        if (isRecord(entry) && entry.type === "output_text" && typeof entry.text === "string") {
          assistantMsg.parts.push({
            type: "text",
            text: entry.text,
          });
        }
      }
      continue;
    }

    // --- Tool call (function_call in the SDK) ---
    if (isFunctionCall(raw)) {
      const assistantMsg = getOrCreateAssistantMessage();
      assistantMsg.parts.push({
        type: "tool_call",
        tool_name: raw.name as string,
        argument: raw.arguments as string,
        callId: (raw.call_id as string) ?? "",
      });
      continue;
    }

    // --- Tool result (function_call_output in the SDK) ---
    if (isFunctionCallOutput(raw)) {
      const assistantMsg = getOrCreateAssistantMessage();
      assistantMsg.parts.push({
        type: "tool_result",
        callId: (raw.call_id as string) ?? "",
        output: raw.output as string,
      });
      continue;
    }

    // Unknown items are silently skipped.
  }

  return messages;
}
