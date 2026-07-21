import { db } from './src/db/index.js';
import { userItems } from './src/db/schema.js';
import { inArray } from 'drizzle-orm';

async function main() {
  const items = await db.select().from(userItems).where(
    inArray(userItems.itemCategory, ['places', 'events', 'event'])
  );
  
  let count = 0;
  for (const item of items) {
    const data = item.metadata || {};
    const metaStr = JSON.stringify(data).toLowerCase();
    if (metaStr.includes('drama') || metaStr.includes('fiction')) {
      console.log(`${item.id}: ${item.title} -> ${metaStr}`);
      count++;
    }
  }
  console.log(`Found ${count} with drama/fiction in userItems.`);
}
main().catch(console.error).finally(() => process.exit(0));
