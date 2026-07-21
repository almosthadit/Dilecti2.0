import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT count(*) FROM global_items WHERE embedding IS NULL;`);
  const result2 = await db.execute(sql`SELECT count(*) FROM global_items WHERE embedding IS NOT NULL;`);
  console.log('Null embeddings:', result.rows[0].count);
  console.log('Not null embeddings:', result2.rows[0].count);
  process.exit(0);
}
main();
