/**
 * geminiClient.js
 * Singleton wrapper for Google Gemini API
 * Models used:
 *   - text-embedding-004 → generate embeddings for RAG
 *   - gemini-2.0-flash   → generate chat responses
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Embedding Model ──────────────────────────────────────────────────────────
// Note: Index dimension is 3072. gemini-embedding-001 returns 3072 by default here.
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

// ─── Chat Model ───────────────────────────────────────────────────────────────
const chatModel = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
});

/**
 * Retry helper for Gemini API calls
 * @param {Function} fn 
 * @param {number} retries 
 * @param {number} delay 
 */
async function retryWithBackoff(fn, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
      if (isRateLimit && i < retries - 1) {
        console.warn(`[Gemini] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

/**
 * Generate a embedding vector for a given text
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  return await retryWithBackoff(async () => {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  });
}

/**
 * Generate embeddings for a list of chunks with batching and rate limit protection
 * @param {string[]} chunks 
 * @returns {Promise<number[][]>}
 */
export async function generateBatchEmbeddings(chunks) {
  const BATCH_SIZE = 50; // Gemini supports up to 100, but 50 is safer for token limits
  const results = [];
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`[Gemini] Embedding batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)} (${batch.length} chunks)`);
    
    const batchResults = await retryWithBackoff(async () => {
      const response = await embeddingModel.batchEmbedContents({
        requests: batch.map(text => ({ content: { parts: [{ text }] } }))
      });
      return response.embeddings.map(e => e.values);
    });
    
    results.push(...batchResults);
    
    // Add a small delay between batches to stay under RPM limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(res => setTimeout(res, 2000)); 
    }
  }
  
  return results;
}

/**
 * Generate an AI response using RAG context
 * @param {string} userQuestion   The user's original question
 * @param {string[]} contextChunks Retrieved document chunks from Pinecone
 * @param {Array<{role:string, parts:Array<{text:string}>}>} history  Chat history
 * @returns {Promise<string>}
 */
export async function generateRAGResponse(userQuestion, contextChunks, history = []) {
  const contextText = contextChunks.length > 0
    ? contextChunks.map((c, i) => c).join('\n\n')
    : 'Không tìm thấy tài liệu liên quan.';

  const systemPrompt = `Bạn là trợ lý AI thông minh, một người bạn đồng hành tin cậy chuyên về sức khỏe mẹ và bé, thai kỳ và phương pháp giáo dục Montessori.

PHONG CÁCH TRẢ LỜI:
1. Gần gũi, ấm áp, như một người thân trong gia đình nhưng vẫn đảm bảo tính chuyên môn và chi tiết.
2. Trình bày nội dung một cách đầy đủ, có chiều sâu, giải thích cặn kẽ các vấn đề thay vì trả lời ngắn gọn.
3. TUYỆT ĐỐI KHÔNG liệt kê các nguồn tham khảo như "[Tài liệu 1]" hay "Theo tài liệu...". Hãy lồng ghép kiến thức từ tài liệu vào câu trả lời một cách tự nhiên nhất.
4. Luôn trả lời bằng tiếng Việt, có cấu trúc rõ ràng (sử dụng gạch đầu dòng, tiêu đề nhỏ nếu cần).

Dưới đây là kiến thức nền tảng để bạn tham khảo (Hãy sử dụng chúng để trả lời nhưng đừng nhắc tên tài liệu):
${contextText}

Hãy dựa vào kiến thức trên để trả lời câu hỏi của người dùng một cách tâm huyết và chi tiết nhất. Nếu thông tin không có trong tài liệu, hãy sử dụng kiến thức chuyên môn của bạn để tư vấn thêm một cách thận trọng.`;

  const chat = chatModel.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Chào bạn, mình đã sẵn sàng. Mình sẽ đồng hành cùng bạn bằng phong cách gần gũi, chia sẻ chi tiết mọi kiến thức về mẹ bé và Montessori mà không làm câu trả lời trở nên khô cứng bởi các trích dẫn tài liệu.' }],
      },
      ...history,
    ],
  });

  return await retryWithBackoff(async () => {
    const result = await chat.sendMessage(userQuestion);
    return result.response.text();
  });
}
