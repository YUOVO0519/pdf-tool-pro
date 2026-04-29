import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { put, del } from '@vercel/blob';

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

  let tempFileUrl = '';
  let outputFileUrl = '';
  
  try {
    // 1. Read file from request
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);
    
    // 2. Generate unique filename
    const timestamp = Date.now();
    const inputName = `input_${timestamp}.pdf`;
    
    // 3. Upload to Blob (temp storage)
    const inputBlob = await put(inputName, pdfBuffer, {
      access: 'public',
    });
    tempFileUrl = inputBlob.url;
    
    // 4. Load and compress PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const compressed = await pdfDoc.save({
      useFlateCompression: true,
      objectStreams: 'generate',
    });
    
    // 5. Upload compressed result
    const outputName = `compressed_${timestamp}.pdf`;
    const outputBlob = await put(outputName, compressed, {
      access: 'public',
    });
    outputFileUrl = outputBlob.url;
    
    // 6. Clean up input file
    await del(inputBlob.url).catch(() => {});
    
    // 7. Return download URL
    res.json({
      success: true,
      downloadUrl: outputFileUrl,
      fileName: `compressed_${timestamp}.pdf`,
      originalSize: pdfBuffer.length,
      compressedSize: compressed.length,
      savedBytes: pdfBuffer.length - compressed.length,
    });
  } catch (error: unknown) {
    // Clean up on error
    if (tempFileUrl) await del(tempFileUrl).catch(() => {});
    if (outputFileUrl) await del(outputFileUrl).catch(() => {});
    
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
