import { getEmbedding } from './src/utils/embeddings.js';

async function main() {
  const emb = await getEmbedding("hello world");
  console.log(emb.slice(0, 5));
}
main();
