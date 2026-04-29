import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipart(buffer: Buffer, boundary: string) {
  const files: { name: string; data: Buffer; filename: string; mimeType: string }[] = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  
  let start = 0;
  while (start < buffer.length) {
    const boundaryPos = buffer.indexOf(boundaryBuffer, start);
    if (boundaryPos === -1) break;
    
    let headerStart = boundaryPos + boundaryBuffer.length;
    if (buffer[headerStart] === 0x0D && buffer[headerStart + 1] === 0x0A) headerStart += 2;
    if (buffer[headerStart] === 0x0D && buffer[headerStart + 1] === 0x0A) headerStart += 2;
    
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    
    const headers = buffer.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    
    let nextBoundary = buffer.indexOf(Buffer.from('\r\n'), dataStart);
    if (nextBoundary === -1) nextBoundary = buffer.length;
    
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    
    if (filenameMatch) {
      files.push({
        name: nameMatch?.[1] || 'file',
        filename: filenameMatch[1],
        mimeType: contentTypeMatch?.[1] || 'application/octet-stream',
        data: buffer.slice(dataStart, nextBoundary),
      });
    }
    
    start = nextBoundary;
  }
  
  return { files };
}

function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  return match ? (match[1] || match[2]) : null;
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
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const pdfDoc = await PDFDocument.create();
    
    for (const file of files) {
      try {
        const ext = file.filename?.split('.').pop()?.toLowerCase() || '';
        const mimeType = file.mimeType.toLowerCase();
        
        let img;
        if (ext === 'png' || mimeType.includes('png')) {
          img = await pdfDoc.embedPng(file.data);
        } else if (ext === 'jpg' || ext === 'jpeg' || mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          img = await pdfDoc.embedJpg(file.data);
        } else {
          console.log('Unsupported file type:', ext, mimeType);
          continue;
        }
        
        pdfDoc.addPage([img.width, img.height]).drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
      } catch (imgError) {
        console.error('Error processing image:', file.filename, imgError);
        continue;
      }
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
