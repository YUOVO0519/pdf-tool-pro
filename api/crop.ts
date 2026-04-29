import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { put, del } from '@vercel/blob';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const srcPdf = await PDFDocument.load(await file.arrayBuffer());
    const pdfDoc = await PDFDocument.create();
    const pages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
    pages.forEach(page => pdfDoc.addPage(page));

    const cropped = await pdfDoc.save();
    const timestamp = Date.now();
    const filename = `cropped_${timestamp}.pdf`;
    
    const blob = await put(filename, cropped, { access: 'public' });

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
