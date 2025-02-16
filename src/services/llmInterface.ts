import { NextApiRequest, NextApiResponse } from "next";
import CryptoJS from "crypto-js";

export default class LLMInterface {
  private BASE_URL = "https://api.openai.com/v1/chat/completions";
  private API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  private SYSTEM_PROMPT = `You are a specialized medical research expert called MediSync. Provide in-depth, accurate medical answers in clear markdown with bullet points, headings, etc. You will not entertain any questions not related to healthcare or medicine`;
  private stopWords = [
    "the","is","in","at","of","a","and","to","with","for","on","by","an","be",
    "this","that","it","as","from","or","which","but","not","are","was","were",
    "has","have","had","will","would","can","could","should","may","might","must","shall"
  ];
  private synonyms = {
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
  private req;
  private res;

  constructor(req: NextApiRequest, res: NextApiResponse) {
    this.req = req;
    this.res = res;
  }

  optimize(queries: string[]): string[] {
    return queries.map(query => {
      let optimizedQuery = query.replace(/\s+/g, ' ').trim();
      optimizedQuery = optimizedQuery
        .split(' ')
        .filter(word => !this.stopWords.includes(word.toLowerCase()))
        .join(' ');
      optimizedQuery = optimizedQuery
        .split(' ')
        .map(word => this.synonyms[word.toLowerCase()] || word)
        .join(' ');
      return optimizedQuery;
    });
  }

  validation() {
    if (this.req.method !== "POST") {
      return this.res.status(405).json({ error: "Method Not Allowed" });
    }
    const { queries } = this.req.body as { queries?: string[] };
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return this.res.status(400).json({ error: "Queries must be a non-empty array." });
    }
    if (!this.API_KEY) {
      return this.res.status(500).json({ error: "Missing OpenAI API Key." });
    }
    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
    if (!secretKey) {
      return this.res.status(500).json({ error: "Missing secret key" });
    }
    return queries;
  }

  decrypt(queries: any[], secretKey: string) {
    return queries.map(encryptedQuery => {
      const bytes = CryptoJS.AES.decrypt(encryptedQuery, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    });
  }

  async send(optimizedQueries: string[]) {
    const searchResponse = await fetch("http://127.0.0.1:5001/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: optimizedQueries.join(" ") }),
    });
    if (!searchResponse.ok) {
      return this.res.status(searchResponse.status).json({
        error: `Search API Error: ${searchResponse.statusText}`,
      });
    }
    const searchData = await searchResponse.json();
    const searchResults = searchData.results || [];
    const messages = [
      { role: "system", content: this.SYSTEM_PROMPT },
      {
        role: "user",
        content: `${optimizedQueries.join("\n")}\n\nSearch Context:\n${searchResults.join("\n")}`
      }
    ];
    const response = await fetch(this.BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
      }),
    }).catch(err => console.error(err));
    if (!response || !response.ok) {
      return this.res.status(response?.status || 500).json({
        error: `OpenAI API Error: ${response?.statusText || "Unknown error"}`,
      });
    }
    this.res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    if (!reader) {
      return this.res.status(500).json({ error: "No reader from OpenAI API response." });
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
          this.res.write("event: done\ndata: [DONE]\n\n");
          this.res.end();
          return;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const contentChunk = parsed.choices?.[0]?.delta?.content ?? "";
          if (contentChunk) {
            this.res.write(`data: ${contentChunk}\n\n`);
          }
        } catch {}
      }
      buffer = lines[lines.length - 1];
    }
    this.res.write("event: done\ndata: [DONE]\n\n");
    this.res.end();
  }
}
