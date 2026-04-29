// PDF Tool Pro - Vercel Serverless Backend
import type { VercelRequest, VercelResponse } from '@vercel/node';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  // Parse the path from URL - Vercel rewrites /api/health -> /api/health
  const urlParts = req.url.split('?')[0];
  const path = urlParts.replace(/^\/api\//, '') || '';

  // Health check
  if (path === 'health') {
    res.json({ status: 'ok', service: 'PDF Tool Pro API' });
    return;
  }

  res.status(404).json({ error: 'Not found', path });
}
