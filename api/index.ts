import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ 
    service: 'PDF Tool Pro API',
    routes: ['/api/health', '/api/compress', '/api/ocr']
  });
}
