import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testEmbedding() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelsToTest = ['text-embedding-004', 'gemini-embedding-001', 'models/text-embedding-004', 'models/gemini-embedding-001'];
  
  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.embedContent("Hello world");
      console.log(`✅ Success with ${m}: dims = ${result.embedding.values.length}`);
    } catch (err) {
      console.log(`❌ Failed with ${m}: ${err.message} (status: ${err.status})`);
    }
  }
}

testEmbedding();
