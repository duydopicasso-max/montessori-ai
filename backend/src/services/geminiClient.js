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

/**
 * Community-optimized RAG response: concise, mobile-friendly, structured.
 * Max ~200 words. No raw Markdown. Structured as:
 *   1. Direct answer (1–3 sentences)
 *   2. Gợi ý thực hành (2–4 bullets)
 *   3. Lưu ý an toàn (optional)
 *
 * @param {string}   userQuestion
 * @param {string[]} contextChunks
 * @param {Array}    history
 * @param {string}   roomType
 * @returns {Promise<string>}
 */
export async function generateCommunityRAGResponse(
  userQuestion, contextChunks, history = [], roomType = 'general'
) {
  const contextText = contextChunks.length > 0
    ? contextChunks.join('\n\n')
    : 'Không có tài liệu liên quan trực tiếp.';

  const safetyNote = roomType === 'health'
    ? '\nLƯU Ý QUAN TRỌNG: Luôn nhắc người dùng rằng thông tin chỉ mang tính tham khảo và không thay thế tư vấn bác sĩ. Nếu bé sinh non, có dị ứng, hoặc tình trạng đặc biệt, khuyên hỏi bác sĩ.'
    : roomType === 'weaning'
    ? '\nLƯU Ý QUAN TRỌNG: Nhắc sữa mẹ hoặc sữa công thức vẫn là nguồn dinh dưỡng chính dưới 1 tuổi. Không ép bé ăn. Nếu bé có dị ứng hoặc sinh non, gợi ý hỏi bác sĩ.'
    : '';

  const systemPrompt = `Bạn là Montessori AI — trợ lý đồng hành của các mẹ bầu và mẹ nuôi con nhỏ trong ứng dụng Montessori AI.

NHIỆM VỤ: Trả lời câu hỏi dưới đây ngắn gọn, rõ ràng, thân thiện — phù hợp đọc trên màn hình điện thoại.

QUY TẮC BẮT BUỘC:
1. Tối đa 200 từ cho toàn bộ câu trả lời.
2. Cấu trúc cố định (sử dụng các phần rõ ràng, không dùng ký hiệu Markdown thô như ##, **, ---):
   - Câu trả lời trực tiếp (1–3 câu ngắn)
   - Gợi ý thực hành (2–4 gạch đầu dòng, mỗi gạch tối đa 1 dòng)
   - Lưu ý an toàn (nếu cần, 1–2 câu)
3. Không dùng ## hay ### làm tiêu đề — dùng văn xuôi hoặc chỉ dùng dấu gạch đầu dòng (•) cho danh sách.
4. Không mở đầu bằng lời chúc hay lời xã giao dài. Trả lời trực tiếp.
5. Không nhắc tên tài liệu hay nguồn — lồng ghép tự nhiên.
6. Nếu không đủ thông tin trong tài liệu, sử dụng kiến thức chuyên môn nhưng nói thêm "Mẹ có thể hỏi thêm bác sĩ để được tư vấn cụ thể hơn."${safetyNote}

TÀI LIỆU THAM KHẢO:
${contextText}

Bây giờ hãy trả lời câu hỏi sau theo đúng cấu trúc trên:`;

  const communityModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.55,
      topK: 30,
      topP: 0.90,
      maxOutputTokens: 600,  // ~200 words
    },
  });

  const chat = communityModel.startChat({
    history: [
      {
        role:  'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role:  'model',
        parts: [{ text: 'Đã hiểu. Mình sẽ trả lời ngắn gọn, rõ ràng, không dùng ký hiệu Markdown thô, tối đa 200 từ, trả lời trực tiếp trước.' }],
      },
      ...history,
    ],
  });

  return await retryWithBackoff(async () => {
    const result = await chat.sendMessage(userQuestion);
    return result.response.text();
  });
}
