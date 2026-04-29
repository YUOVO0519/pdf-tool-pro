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
    const form = formidable();
    const fields = await form.parse(req as any);
    
    // fields[0] contains the fields, fields[1] contains the files
    const files = fields[1]['files[]'] || fields[1]['files'] || [];
    const fileArray = Array.isArray(files) ? files : [files];
    
    if (fileArray.length < 2) {
      res.status(400).json({ error: 'Need at least 2 PDF files to merge' });
      return;
    }

    const pdfDoc = await PDFDocument.create();
    
    for (const file of fileArray) {
      if (!file || !file.path) continue;
      const fs = await import('fs');
      const data = fs.readFileSync(file.path);
      const srcPdf = await PDFDocument.load(data);
      const pages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
      pages.forEach(page => pdfDoc.addPage(page));
    }

    const merged = await pdfDoc.save();
    const timestamp = Date.now();
    const filename = `merged_${timestamp}.pdf`;
    
    const blob = await put(filename, Buffer.from(merged), { access: 'public' });

    res.json({
      success: true,
      downloadUrl: blob.url,
      fileName: filename,
      fileCount: fileArray.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
