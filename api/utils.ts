// Simple multipart parser for Vercel serverless
export function parseMultipart(buffer: Buffer, boundary: string): { files: { name: string; data: Buffer; filename: string; mimeType: string }[] } {
  const files: { name: string; data: Buffer; filename: string; mimeType: string }[] = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
  
  let start = 0;
  while (start < buffer.length) {
    const boundaryPos = buffer.indexOf(boundaryBuffer, start);
    if (boundaryPos === -1) break;
    
    // Skip boundary and CRLF
    let headerStart = boundaryPos + boundaryBuffer.length;
    if (buffer[headerStart] === 0x0D && buffer[headerStart + 1] === 0x0A) headerStart += 2;
    if (buffer[headerStart] === 0x0D && buffer[headerStart + 1] === 0x0A) headerStart += 2;
    
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    
    const headers = buffer.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    
    // Find next boundary
    let nextBoundary = buffer.indexOf(Buffer.from('\r\n'), dataStart);
    if (nextBoundary === -1) nextBoundary = buffer.length;
    
    // Parse Content-Disposition header
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

export function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  return match ? (match[1] || match[2]) : null;
}
