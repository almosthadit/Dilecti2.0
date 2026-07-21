import { pipeline, env } from '@xenova/transformers';
import crypto from 'crypto';

// Use Xenova's generic local behavior (fetches from HF hub initially then caches locally)
env.allowLocalModels = false;
env.useBrowserCache = false;
if (typeof process !== 'undefined') {
  env.backends.onnx.wasm.numThreads = 1;
}

let extractorPipeline: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim() === '') return [];
  try {
    if (!extractorPipeline) {
      extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true, // uses a smaller fast model
      });
    }
    const result = await extractorPipeline(text, { pooling: 'mean', normalize: true });
    // result.data is a Float32Array, convert to simple number[] for firestore compatibility sometimes
    return Array.from(result.data);
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}
