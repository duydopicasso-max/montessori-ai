import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const models = await genAI.listModels();
    console.log('Available Models:');
    models.models.forEach(m => console.log(`- ${m.name}`));
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
