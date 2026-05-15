/**
 * documentProcessor.js
 * Handles chunking of text/PDF documents for ingestion into Pinecone
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Split text into overlapping chunks for better RAG retrieval
 * @param {string} text       Full document text
 * @param {number} chunkSize  Characters per chunk
 * @param {number} overlap    Overlap between chunks
 * @returns {string[]}
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  // Clean the text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return chunks;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    let chunk = cleanText.slice(start, end);

    // Try to break at sentence boundary
    if (end < cleanText.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }

    // CRITICAL: always advance by at least (chunkSize - overlap) to prevent infinite loop
    const advance = Math.max(chunk.length - overlap, Math.floor(chunkSize / 2));
    start += advance;
  }

  return chunks;
}


/**
 * Create Pinecone-ready vector records from document chunks
 * @param {string[]} chunks
 * @param {number[][]} embeddings   One embedding per chunk
 * @param {string} sourceName       Document filename / title
 * @returns {Array<{id, values, metadata}>}
 */
export function createVectorRecords(chunks, embeddings, sourceName) {
  return chunks.map((chunk, index) => ({
    id: `${uuidv4()}`,
    values: embeddings[index],
    metadata: {
      text: chunk,
      source: sourceName,
      chunkIndex: index,
      totalChunks: chunks.length,
      ingestedAt: new Date().toISOString(),
    },
  }));
}
