/**
 * pineconeClient.js
 * Pinecone Vector Database client
 * Handles: upsert, query, and namespace management
 */
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeIndex = null;

/**
 * Lazily initialize and return the Pinecone index
 * @returns {Promise<import('@pinecone-database/pinecone').Index>}
 */
async function getIndex() {
  if (pineconeIndex) return pineconeIndex;

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const indexName = process.env.PINECONE_INDEX_NAME || 'montessori-v2';

  // List existing indexes
  const existingIndexes = await pc.listIndexes();
  const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

  if (!indexExists) {
    console.log(`[Pinecone] Creating index "${indexName}" (3072 dims)...`);
    await pc.createIndex({
      name: indexName,
      dimension: 3072,        // gemini-embedding-001 outputs 3072 dims
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
    // Wait for index to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log(`[Pinecone] Index "${indexName}" created successfully.`);
  }

  pineconeIndex = pc.index(indexName);
  return pineconeIndex;
}

/**
 * Upsert document vectors into Pinecone
 * @param {Array<{id: string, values: number[], metadata: object}>} vectors
 * @param {string} namespace
 */
export async function upsertVectors(vectors, namespace = 'montessori') {
  const index = await getIndex();
  const ns = index.namespace(namespace);

  // Batch upsert in chunks of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await ns.upsert(batch);
    console.log(`[Pinecone] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
  }
}

/**
 * Query similar vectors from Pinecone
 * @param {number[]} queryVector
 * @param {number} topK
 * @param {string} namespace
 * @returns {Promise<Array<{text: string, score: number, source: string}>>}
 */
export async function querySimilar(queryVector, topK = 5, namespace = 'montessori') {
  const index = await getIndex();
  const ns = index.namespace(namespace);

  const results = await ns.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  return results.matches
    .filter(match => match.score > 0.5) // Minimum similarity threshold
    .map(match => ({
      text: match.metadata?.text || '',
      score: match.score,
      source: match.metadata?.source || 'unknown',
      chunkIndex: match.metadata?.chunkIndex || 0,
    }));
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  const index = await getIndex();
  return await index.describeIndexStats();
}
