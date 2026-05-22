import 'dotenv/config';
import { runCommunityRAGPipeline } from '../services/ragService.js';

async function test() {
  try {
    console.log("Testing Community RAG Pipeline...");
    const res = await runCommunityRAGPipeline("Bé 6 tháng ăn gì đầu tiên?", "weaning", []);
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("FAILED:", err);
  }
}
test();
