import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
export const config = {
  api: {
    bodyParser: false,
  },
};
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
  const form = formidable({ multiples: true });
    form.parse(req, async (err: any, fields: any, files: any) => {
      if (err) {
        return res.status(500).json({ message: 'Error parsing the file' });
      }
  
      const file = files.file as formidable.File;
      const filePath = file.filepath;
  
      try {
        const worker = await createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data: { text } } = await worker.recognize(filePath);
        await worker.terminate();
  
        fs.unlinkSync(filePath); // Clean up the file after processing
        return res.status(200).json({ text });
      } catch (error) {
        return res.status(500).json({ message: 'Error processing the file' });
      }
    });
  } catch(error) {
    console.error(error);
  }
};
export default handler;