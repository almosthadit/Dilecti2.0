import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT format_type(atttypid, atttypmod) FROM pg_attribute WHERE attrelid = 'global_items'::regclass AND attname = 'embedding';`);
  console.log(result.rows);
  process.exit(0);
}
main();
