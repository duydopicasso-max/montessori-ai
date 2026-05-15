/**
 * ragService.js
 * Core RAG (Retrieval-Augmented Generation) pipeline
 *
 * Flow:
 *   User Query → Embed → Pinecone Search → Context Assembly → Gemini → Response
 */
import { generateEmbedding, generateRAGResponse } from './geminiClient.js';
import { querySimilar } from './pineconeClient.js';

/**
 * Main RAG pipeline: given a user question and chat history,
 * retrieve relevant context from Pinecone and generate a grounded response.
 *
 * @param {string} question         The user's question
 * @param {Array}  chatHistory      Previous conversation messages
 * @param {string} namespace        Pinecone namespace (default: 'montessori')
 * @returns {Promise<{answer: string, sources: Array, contextUsed: number}>}
 */
export async function runRAGPipeline(question, chatHistory = [], namespace = 'montessori') {
  console.log(`[RAG] Processing question: "${question.substring(0, 80)}..."`);

  // ── Step 1: Embed the user question ─────────────────────────────────────────
  console.log('[RAG] Step 1: Generating query embedding...');
  const queryVector = await generateEmbedding(question);

  // ── Step 2: Retrieve relevant chunks from Pinecone ───────────────────────────
  console.log('[RAG] Step 2: Querying Pinecone for similar chunks...');
  const retrievedDocs = await querySimilar(queryVector, 5, namespace);
  console.log(`[RAG] Retrieved ${retrievedDocs.length} relevant document chunks.`);

  // ── Step 3: Extract text chunks for context ──────────────────────────────────
  const contextChunks = retrievedDocs.map(doc => doc.text);
  const sources = retrievedDocs.map(doc => ({
    source: doc.source,
    score: Math.round(doc.score * 100) / 100,
  }));

  // ── Step 4: Format history for Gemini chat ───────────────────────────────────
  const formattedHistory = chatHistory.flatMap(msg => [
    { role: 'user', parts: [{ text: msg.userMessage }] },
    { role: 'model', parts: [{ text: msg.aiMessage }] },
  ]);

  // ── Step 5: Generate response with Gemini ────────────────────────────────────
  console.log('[RAG] Step 4: Generating response with Gemini...');
  const answer = await generateRAGResponse(question, contextChunks, formattedHistory);

  console.log('[RAG] Pipeline complete.');
  return {
    answer,
    sources,
    contextUsed: retrievedDocs.length,
  };
}
