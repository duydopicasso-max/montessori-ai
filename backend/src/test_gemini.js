import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  const chatModel = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const question = "Thiết lập lịch sinh hoạt EASY cho bé sơ sinh?";
  const systemPrompt = `Bạn là trợ lý AI thông minh, một người bạn đồng hành tin cậy chuyên về sức khỏe mẹ và bé, thai kỳ và phương pháp giáo dục Montessori.
Luôn trả lời đầy đủ, chi tiết bằng tiếng Việt.`;

  const chat = chatModel.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Chào bạn, mình đã sẵn sàng.' }] },
    ],
  });

  console.log("Sending message...");
  const result = await chat.sendMessage(question);
  
  console.log("Response text length:", result.response.text().length);
  console.log("Full response object:");
  console.log(JSON.stringify(result.response, null, 2));
}

test().catch(console.error);
