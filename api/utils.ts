// Simple multipart parser for Vercel serverless - fixed for binary data
export function parseMultipart(buffer: Buffer, boundary: string): { files: { name: string; data: Buffer; filename: string; mimeType: string }[] } {
  const files: { name: string; data: Buffer; filename: string; mimeType: string }[] = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
  
  let start = 0;
  while (start < buffer.length) {
    // Find next boundary
    const boundaryPos = buffer.indexOf(boundaryBuffer, start);
    if (boundaryPos === -1 || boundaryPos >= buffer.length) break;
    
    // Skip boundary and CRLF
    let headerStart = boundaryPos + boundaryBuffer.length;
    if (headerStart >= buffer.length) break;
    
    // Check if it's end boundary
    if (buffer.slice(headerStart, headerStart + 2).equals(Buffer.from('--'))) {
      break; // End boundary found
    }
    
    // Skip leading CRLF
    if (buffer[headerStart] === 0x0D && buffer[headerStart + 1] === 0x0A) headerStart += 2;
    if (buffer[headerStart] === 0x0D && buffer[headerStart + 1] === 0x0A) headerStart += 2;
    
    const headerEnd = buffer.indexOf(Buffer.from([0x0D, 0x0A, 0x0D, 0x0A]), headerStart);
    if (headerEnd === -1) break;
    
    const headers = buffer.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    
    // Find next boundary (not just \r\n!) - look for --boundary
    let dataEnd = buffer.length;
    for (let i = dataStart; i < buffer.length - boundaryBuffer.length - 2; i++) {
      if (buffer[i] === 0x0D && buffer[i+1] === 0x0A) {
        // Check if this is followed by --boundary
        const afterCRLF = i + 2;
        if (buffer.slice(afterCRLF, afterCRLF + boundaryBuffer.length).equals(boundaryBuffer)) {
          dataEnd = i; // This \r\n is followed by a boundary
          break;
        }
      }
    }
    
    // Parse Content-Disposition header
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    
    if (filenameMatch) {
      const fileData = buffer.slice(dataStart, dataEnd);
      // Trim trailing \r\n
      if (fileData[fileData.length - 1] === 0x0A) {
        files.push({
          name: nameMatch?.[1] || 'file',
          filename: filenameMatch[1],
          mimeType: contentTypeMatch?.[1] || 'application/octet-stream',
          data: fileData[fileData.length - 2] === 0x0D ? fileData.slice(0, -2) : fileData,
        });
      }
    }
    
    start = dataEnd;
    // Skip past the \r\n before the next boundary
    if (start < buffer.length && buffer[start] === 0x0D && buffer[start+1] === 0x0A) {
      start += 2;
    }
  }
  
  return { files };
}

export function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  return match ? (match[1] || match[2]) : null;
}
