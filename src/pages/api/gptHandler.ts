import type { NextApiRequest, NextApiResponse } from "next";
import { PorterStemmer } from 'natural';

// Constants
const BASE_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const SYSTEM_PROMPT =
  "You are a specialized medical research expert. Provide in-depth, accurate medical answers in clear markdown with bullet points, headings, etc.";

// List of stop words
const stopWords = ["the", "is", "in", "at", "of", "a", "and", "to", "with", "for", "on", "by", "an", "be", "this", "that", "it", "as", "from", "or", "which", "but", "not", "are", "was", "were", "has", "have", "had", "will", "would", "can", "could", "should", "may", "might", "must", "shall"];

// Synonym dictionary
const synonyms: { [key: string]: string } = {
  "information": "info",
  "medical": "med",
  "research": "study",
  "provide": "give",
  "accurate": "precise",
  "answers": "responses",
  "markdown": "md",
  "bullet points": "bullets",
  "headings": "titles"
};


function optimizeQueries(queries: string[]): string[] {
  return queries.map(query => {
    // Remove extra spaces
    let optimizedQuery = query.replace(/\s+/g, ' ').trim();

    // Remove stop words
    optimizedQuery = optimizedQuery.split(' ')
      .filter(word => !stopWords.includes(word.toLowerCase()))
      .join(' ');

    // Replace synonyms
    optimizedQuery = optimizedQuery.split(' ')
      .map(word => synonyms[word.toLowerCase()] || word)
      .join(' ');

    // TODO Apply stemming

    return optimizedQuery;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if the request method is POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Extract queries from the request body
    const { queries } = req.body as { queries?: string[] };
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "Queries must be a non-empty array." });
    }

    // Check if the API key is available
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing OpenAI API Key." });
    }

    // Optimize the queries to reduce token count
    const optimizedQueries = optimizeQueries(queries);

    // Combine the system prompt with optimized user queries
    const combinedQuery = `${SYSTEM_PROMPT}\n${optimizedQueries.join("\n")}`;

    // Make a request to the OpenAI API
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

    // Handle non-OK responses from the OpenAI API
    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenAI API Error: ${response.statusText}`,
      });
    }

    // Set up the response headers for Server-Sent Events (SSE)
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Read the response stream from the OpenAI API
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Handle the case where no reader is available
    if (!reader) {
      return res.status(500).json({ error: "No reader from OpenAI API response." });
    }

    // Process the response stream
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

    // Signal the end of the response stream
    res.write("event: done\ndata: [DONE]\n\n");
    res.end();
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}