import { db } from './src/db/index.js';
import { globalItems } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';

async function main() {
  const global = await db.select().from(globalItems).where(
    or(eq(globalItems.category, 'places'), eq(globalItems.category, 'events'))
  );
  
  for (const item of global) {
    const tags = item.data?.genres || item.data?.metadata?.genres || item.data?.metadata?.tags || item.data?.tags || [];
    console.log(`${item.id} (${item.category}): ${item.title} -> ${JSON.stringify(tags)}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
