import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import OpenAI from "openai";

const app = new Hono();
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

app.use("/*", cors());

app.post("/chat", async (c) => {
  const { message } = await c.req.json<{ message: string }>();

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: message },
    ],
    stream: true,
  });

  return streamSSE(c, async (sseStream) => {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        await sseStream.writeSSE({
          data: JSON.stringify({ type: "text_delta", delta }),
        });
      }
    }
    await sseStream.writeSSE({ data: "[DONE]" });
  });
});

serve({ fetch: app.fetch, port: 8000 }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
