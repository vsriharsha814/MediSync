import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing or invalid search query (?q=...)" });
    }
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Brave API key not configured on server" });
    }
    const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}`;
    const response = await fetch(endpoint, {
      headers: { "X-Subscription-Token": apiKey },
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch from Brave API: ${response.statusText}`,
      });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
