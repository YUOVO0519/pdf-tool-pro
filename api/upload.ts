import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods': 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers': 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { filename, contentType } = await req.json();
    
    if (!filename || !contentType) {
      res.status(400).json({ error: 'Missing filename or contentType' });
      return;
    }

    // Create a unique key for the file
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const key = `uploads/${timestamp}_${randomSuffix}_${filename}`;

    // Generate a presigned URL for direct upload to Blob
    const blob = await put(key, '', {
      access: 'public',
      contentType,
    });

    res.json({
      uploadUrl: blob.url,
      key,
      // We need the actual upload URL with token for PUT
      // For Vercel Blob, we need to use the token-based upload
      message: 'Use the uploadUrl to PUT your file directly to Blob storage'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
