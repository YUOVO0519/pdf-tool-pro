import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ 
    status: 'ok', 
    service: 'PDF Tool Pro API',
    timestamp: new Date().toISOString()
  });
}
