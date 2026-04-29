// Proper multipart parser that handles binary data correctly
export function parseMultipart(buffer: Buffer, boundary: string): { files: { name: string; data: Buffer; filename: string; mimeType: string }[] } {
  const files: { name: string; data: Buffer; filename: string; mimeType: string }[] = [];
  
  // Create boundary markers
  const bounder = '--' + boundary;
  const boundaryBytes = Buffer.from(bounder);
  const endBoundaryBytes = Buffer.from(bounder + '--');
  
  // Find all boundary positions
  const positions: number[] = [];
  let pos = 0;
  while (pos < buffer.length) {
    const idx = buffer.indexOf(boundaryBytes, pos);
    if (idx === -1) break;
    positions.push(idx);
    pos = idx + boundaryBytes.length;
  }
  
  // Process each section between boundaries
  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i] + boundaryBytes.length;
    let end = positions[i + 1];
    
    // Skip CRLF after boundary
    let dataStart = start;
    if (dataStart < end && buffer[dataStart] === 0x0D && buffer[dataStart + 1] === 0x0A) {
      dataStart += 2;
    }
    
    // Get headers + data section
    const section = buffer.slice(dataStart, end);
    
    // Find header end (double CRLF)
    const headerEndIdx = section.indexOf(Buffer.from([0x0D, 0x0A, 0x0D, 0x0A]));
    if (headerEndIdx === -1) continue;
    
    const headers = section.slice(0, headerEndIdx).toString();
    const fileData = section.slice(headerEndIdx + 4);
    
    // Parse headers
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    
    if (filenameMatch) {
      // Remove trailing CRLF if present
      let cleanData = fileData;
      if (cleanData.length >= 2 && 
          cleanData[cleanData.length - 2] === 0x0D && 
          cleanData[cleanData.length - 1] === 0x0A) {
        cleanData = cleanData.slice(0, -2);
      }
      
      files.push({
        name: nameMatch?.[1] || 'file',
        filename: filenameMatch[1],
        mimeType: contentTypeMatch?.[1] || 'application/octet-stream',
        data: cleanData,
      });
    }
  }
  
  return { files };
}

export function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  return match ? (match[1] || match[2]) : null;
}
