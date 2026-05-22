import 'dotenv/config';
import { generateEmbedding } from '../services/geminiClient.js';
import { querySimilar } from '../services/pineconeClient.js';

async function test() {
  try {
    console.log("Step 1: Testing generateEmbedding...");
    const vec = await generateEmbedding("Hi");
    console.log("SUCCESS generateEmbedding:", vec.slice(0, 5), "length:", vec.length);

    console.log("Step 2: Testing querySimilar...");
    const docs = await querySimilar(vec, 2, 'montessori');
    console.log("SUCCESS querySimilar:", docs);
  } catch (err) {
    console.error("FAILED:", err);
  }
}
test();
