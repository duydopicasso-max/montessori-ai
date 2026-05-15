/**
 * chat.js — Chat API Route
 * POST /api/chat
 * Body: { message: string, sessionId: string, history?: Array }
 */
import { Router } from 'express';
import { runRAGPipeline } from '../services/ragService.js';

const router = Router();

// In-memory session store (replace with Redis/DB in production)
const sessions = new Map();

router.post('/', async (req, res) => {
  try {
    const { message, sessionId = 'default', history } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
    }

    // Get or initialize session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const sessionHistory = history || sessions.get(sessionId);

    // Run RAG pipeline
    const { answer, sources, contextUsed } = await runRAGPipeline(
      message.trim(),
      sessionHistory.slice(-10), // Last 10 exchanges for context window
    );

    // Update session
    sessions.get(sessionId).push({
      userMessage: message.trim(),
      aiMessage: answer,
      timestamp: new Date().toISOString(),
    });

    res.json({
      answer,
      sources,
      contextUsed,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Chat Route Error]', err);
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
