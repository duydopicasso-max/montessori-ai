import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testChat() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelsToTest = [
    'gemini-3-flash-preview', 
    'gemini-1.5-flash', 
    'gemini-2.0-flash', 
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp'
  ];
  
  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Hi");
      console.log(`✅ Success with ${m}: response = ${result.response.text().substring(0, 20)}...`);
    } catch (err) {
      console.log(`❌ Failed with ${m}: ${err.message} (status: ${err.status})`);
    }
  }
}

testChat();
