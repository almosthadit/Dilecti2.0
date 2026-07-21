import { db } from './src/db/index.js';
import { globalItems } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';

async function main() {
  const global = await db.select().from(globalItems).where(
    or(eq(globalItems.category, 'places'), eq(globalItems.category, 'events'), eq(globalItems.category, 'event'))
  );
  
  let count = 0;
  for (const item of global) {
    const data = item.data || {};
    const metaStr = JSON.stringify(data).toLowerCase();
    if (metaStr.includes('drama') || metaStr.includes('fiction')) {
      console.log(`${item.id}: ${item.title} -> ${metaStr}`);
      count++;
      if (count > 5) break;
    }
  }
  console.log(`Found ${count} with drama/fiction in themes or anywhere.`);
}
main().catch(console.error).finally(() => process.exit(0));
