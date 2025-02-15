import type { NextApiRequest, NextApiResponse } from "next";
import LLMInterface from "@/services/llmInterface";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const llmInterface = new LLMInterface(req, res);
    // Validate the request
    const queries = llmInterface.validation();
    if (!queries) return;

    // Decrypt the queries
    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
    const decryptedQueries = llmInterface.decrypt(queries, secretKey);
    console.log(111,decryptedQueries)

    // Optimize the queries
    const optimizedQueries = llmInterface.optimize(decryptedQueries);

    // Send the request to the LLM API
    await llmInterface.send(optimizedQueries);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error });
  }
}