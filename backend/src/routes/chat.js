/**
 * chat.js — Chat API Route
 * POST /api/chat          → full RAG (chat screen)
 * POST /api/chat/community → concise RAG (community AI sheet)
 * Body: { message, sessionId, roomType?, history? }
 */
import { Router } from 'express';
import { runRAGPipeline, runCommunityRAGPipeline } from '../services/ragService.js';

const router = Router();

// In-memory session store (replace with Redis/DB in production)
const sessions = new Map();

/* ── Full RAG (chat screen) ── */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId = 'default', history } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
    }

    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    const sessionHistory = history || sessions.get(sessionId);

    const { answer, sources, contextUsed } = await runRAGPipeline(
      message.trim(),
      sessionHistory.slice(-10),
    );

    sessions.get(sessionId).push({
      userMessage: message.trim(),
      aiMessage: answer,
      timestamp: new Date().toISOString(),
    });

    res.json({ answer, sources, contextUsed, sessionId, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Chat Route Error]', err);
    res.status(500).json({
      error: 'Có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

/* ── Community RAG (concise, mobile-first) ── */
router.post('/community', async (req, res) => {
  try {
    const { message, sessionId = 'comm-default', roomType = 'general', history } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
    }

    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    const sessionHistory = history || sessions.get(sessionId);

    const { answer, sources, contextUsed, hasDocContext } = await runCommunityRAGPipeline(
      message.trim(),
      roomType,
      sessionHistory.slice(-6),   // shorter window for community
    );

    sessions.get(sessionId).push({
      userMessage: message.trim(),
      aiMessage: answer,
      timestamp: new Date().toISOString(),
    });

    res.json({
      answer,
      sources,
      contextUsed,
      hasDocContext,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Community Chat Error]', err);
    res.status(500).json({
      error: 'Có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Clear session history
router.delete('/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ message: 'Session cleared.' });
});

export default router;
