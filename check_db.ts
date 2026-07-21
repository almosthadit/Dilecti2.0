import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { globalItems } from './src/db/schema';

async function main() {
  const result = await db.select({ count: sql`count(*)` }).from(globalItems);
  console.log('Global items count:', result[0].count);
}
main().catch(console.error);
