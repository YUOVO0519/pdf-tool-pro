// PDF Tool Pro - Vercel Serverless Backend
import type { VercelRequest, VercelResponse } from '@vercel/node';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse the path from URL
  const fullUrl = req.url || '';
  const path = fullUrl.replace(/^\/api\//, '').split('?')[0];

  // Health check
  if (path === 'health') {
    res.json({ status: 'ok', service: 'PDF Tool Pro API' });
    return;
  }

  res.status(404).json({ error: 'Not found', path, url: req.url });
}
