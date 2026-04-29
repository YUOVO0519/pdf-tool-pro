import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { put } from '@vercel/blob';
import Busboy from 'busboy';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipart(req: VercelRequest): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const files: File[] = [];
    const bb = Busboy({ headers: req.headers });
    
    bb.on('file', (name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const file = new File([buffer], info.filename || 'file', { type: info.mimeType });
        files.push(file);
      });
    });
    
    bb.on('error', reject);
    bb.on('finish', () => resolve(files));
    
    req.body.pipe(bb);
  });
}

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
    const files = await parseMultipart(req);
    
    if (files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const pdfDoc = await PDFDocument.create();
    
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      let img;
      
      if (ext === 'png') {
        img = await pdfDoc.embedPng(await file.arrayBuffer());
      } else {
        img = await pdfDoc.embedJpg(await file.arrayBuffer());
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
      imageCount: files.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
