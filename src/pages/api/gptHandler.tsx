import type { NextApiRequest, NextApiResponse } from "next";

const BASE_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const SYSTEM_PROMPT =
  "You are a specialized medical research expert. Provide in-depth, accurate medical answers in clear markdown with bullet points, headings, etc.";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const { queries } = req.body as { queries?: string[] };
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "Queries must be a non-empty array." });
    }
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing OpenAI API Key." });
    }
    const combinedQuery = `${SYSTEM_PROMPT}\n${queries.join("\n")}`;
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: combinedQuery }],
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
      }),
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenAI API Error: ${response.statusText}`,
      });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    if (!reader) {
      return res.status(500).json({ error: "No reader from OpenAI API response." });
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice("data: ".length);
        if (jsonStr === "[DONE]") {
          res.write("event: done\ndata: [DONE]\n\n");
          res.end();
          return;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const contentChunk = parsed.choices?.[0]?.delta?.content ?? "";
          if (contentChunk) {
            res.write(`data: ${contentChunk}\n\n`);
          }
        } catch {}
      }
      buffer = lines[lines.length - 1];
    }
    res.write("event: done\ndata: [DONE]\n\n");
    res.end();
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
