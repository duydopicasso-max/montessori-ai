/**
 * ingest.js — Document Ingestion Route
 * POST /api/ingest/text   → Ingest plain text
 * POST /api/ingest/file   → Ingest TXT file upload
 * GET  /api/ingest/stats  → Get Pinecone index stats
 */
import { Router } from 'express';
import multer from 'multer';
import { generateEmbedding, generateBatchEmbeddings } from '../services/geminiClient.js';
import { upsertVectors, getIndexStats } from '../services/pineconeClient.js';
import { chunkText, createVectorRecords } from '../utils/documentProcessor.js';
import { extractTextFromPDF } from '../utils/pdfExtractor.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// ─── POST /api/ingest/text ────────────────────────────────────────────────────
router.post('/text', async (req, res) => {
  try {
    const { text, sourceName = 'manual-input', namespace = 'montessori' } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Nội dung văn bản quá ngắn (tối thiểu 50 ký tự).' });
    }

    const chunks = chunkText(text);
    console.log(`[Ingest] Chunked "${sourceName}" → ${chunks.length} chunks`);

    const embeddings = await generateBatchEmbeddings(chunks);

    const vectors = createVectorRecords(chunks, embeddings, sourceName);
    await upsertVectors(vectors, namespace);

    res.json({
      success: true,
      message: `Đã nhập ${chunks.length} đoạn văn từ "${sourceName}"`,
      chunksIngested: chunks.length,
      sourceName,
    });
  } catch (err) {
    console.error('[Ingest Text Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ingest/file (TXT & PDF) ─────────────────────────────────────────
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên.' });

    const { namespace = 'montessori' } = req.body;
    const { originalname, buffer } = req.file;
    const lname = originalname.toLowerCase();

    let extractedText = '';
    if (lname.endsWith('.txt') || lname.endsWith('.md')) {
      extractedText = buffer.toString('utf-8');
    } else if (lname.endsWith('.pdf')) {
      console.log(`[Ingest] Đang xử lý file PDF: ${originalname}`);
      extractedText = await extractTextFromPDF(buffer);
    } else {
      return res.status(400).json({ error: 'Chỉ hỗ trợ file TXT, MD hoặc PDF.' });
    }

    if (extractedText.trim().length < 50) {
      return res.status(400).json({ error: 'Nội dung file quá ngắn.' });
    }

    const chunks = chunkText(extractedText);
    console.log(`[Ingest] File "${originalname}" → ${chunks.length} chunks`);

    const embeddings = await generateBatchEmbeddings(chunks);

    const vectors = createVectorRecords(chunks, embeddings, originalname);
    await upsertVectors(vectors, namespace);

    res.json({
      success: true,
      message: `Đã nhập ${chunks.length} đoạn văn từ file "${originalname}"`,
      chunksIngested: chunks.length,
      fileName: originalname,
    });
  } catch (err) {
    console.error('[Ingest File Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ingest/stats ─────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getIndexStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
