/**
 * ragService.js
 * Core RAG (Retrieval-Augmented Generation) pipeline
 *
 * Flow:
 *   User Query → Embed → Pinecone Search → Context Assembly → Gemini → Response
 */
import { generateEmbedding, generateRAGResponse, generateCommunityRAGResponse } from './geminiClient.js';
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

/**
 * Community RAG pipeline: short, mobile-first responses for community chat.
 * Returns hasDocContext=true when Pinecone returned relevant chunks (score >= 0.6).
 *
 * @param {string} question
 * @param {string} roomType  - weaning | pregnancy | sleep | health | family
 * @param {Array}  chatHistory
 * @returns {Promise<{answer: string, sources: Array, contextUsed: number, hasDocContext: boolean}>}
 */
export async function runCommunityRAGPipeline(question, roomType = 'general', chatHistory = []) {
  console.log(`[Community RAG] question: "${question.substring(0, 80)}"`);

  const queryVector   = await generateEmbedding(question);
  const retrievedDocs = await querySimilar(queryVector, 4, 'montessori');

  // Only count as doc-grounded if at least one chunk has score >= 0.60
  const highQualityDocs = retrievedDocs.filter(d => d.score >= 0.60);
  const hasDocContext   = highQualityDocs.length > 0;

  const contextChunks = highQualityDocs.length > 0
    ? highQualityDocs.map(d => d.text)
    : retrievedDocs.map(d => d.text);  // fall back to all

  const sources = retrievedDocs.map(doc => ({
    source: doc.source,
    score:  Math.round(doc.score * 100) / 100,
  }));

  const formattedHistory = chatHistory.flatMap(msg => [
    { role: 'user',  parts: [{ text: msg.userMessage }] },
    { role: 'model', parts: [{ text: msg.aiMessage   }] },
  ]);

  const answer = await generateCommunityRAGResponse(
    question, contextChunks, formattedHistory, roomType
  );

  return { answer, sources, contextUsed: retrievedDocs.length, hasDocContext };
}
