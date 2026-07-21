import { db } from './src/db/index.js';
import { globalItems } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(globalItems).where(sql`${globalItems.title} ILIKE '%sandman%'`).limit(2);
  console.log(result.map(r => r.title));
  process.exit(0);
}
main();
