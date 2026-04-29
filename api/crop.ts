import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { put } from '@vercel/blob';
import { parseMultipart, getBoundary } from './utils';

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
    const chunks: Uint8Array[] = [];
    for await (const chunk of req as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    const contentType = req.headers['content-type'] || '';
    const boundary = getBoundary(contentType);
    
    if (!boundary) {
      res.status(400).json({ error: 'Missing boundary' });
      return;
    }
    
    const { files } = parseMultipart(buffer, boundary);
    
    if (files.length === 0) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const srcPdf = await PDFDocument.load(files[0].data);
    const pdfDoc = await PDFDocument.create();
    const pages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
    pages.forEach(page => pdfDoc.addPage(page));

    const cropped = await pdfDoc.save();
    const timestamp = Date.now();
    const filename = `cropped_${timestamp}.pdf`;
    
    const blob = await put(filename, Buffer.from(cropped), { access: 'public' });

    res.json({
      success: true,
      downloadUrl: blob.url,
      fileName: filename,
      pageCount: pages.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
