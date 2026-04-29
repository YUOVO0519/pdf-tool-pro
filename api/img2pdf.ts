import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { put } from '@vercel/blob';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const form = formidable({ multiples: true });
    const fields = await form.parse(req as any);
    
    // Get all files
    let fileList: any[] = [];
    const files = fields[1];
    for (const key in files) {
      const val = files[key];
      if (Array.isArray(val)) {
        fileList.push(...val);
      } else {
        fileList.push(val);
      }
    }
    
    if (fileList.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const pdfDoc = await PDFDocument.create();
    const fs = await import('fs');
    
    for (const file of fileList) {
      if (!file || !file.path) continue;
      const data = fs.readFileSync(file.path);
      const ext = file.originalFilename?.split('.').pop().toLowerCase() || 'jpg';
      
      let img;
      if (ext === 'png') {
        img = await pdfDoc.embedPng(data);
      } else {
        img = await pdfDoc.embedJpg(data);
      }
      
      pdfDoc.addPage([img.width, img.height]).drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const timestamp = Date.now();
    const filename = `images_${timestamp}.pdf`;
    
    const blob = await put(filename, Buffer.from(pdfBytes), { access: 'public' });

    res.json({
      success: true,
      downloadUrl: blob.url,
      fileName: filename,
      imageCount: fileList.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
