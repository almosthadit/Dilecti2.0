import { db } from './src/db/index.js';
import { globalItems } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';

async function main() {
  const global = await db.select().from(globalItems).where(
    or(eq(globalItems.category, 'places'), eq(globalItems.category, 'events'))
  );
  
  let found = 0;
  for (const item of global) {
    const meta = item.data?.metadata || {};
    const hasDramaFiction = [
      ...(meta.tags || []), 
      ...(meta.genre || []), 
      ...(meta.genres || []), 
      ...(meta.themes || []), 
      ...(meta.moods || []), 
      ...(meta.preferenceTags || [])
    ].some(t => {
      const lower = t.toLowerCase();
      return lower.includes('drama') || lower.includes('fiction');
    });

    if (hasDramaFiction) {
      console.log(`Wrong tags in ${item.category} / ${item.title}:`, JSON.stringify(meta.tags));
      found++;
    }
  }
  console.log('Total wrong drama/fiction in fields:', found);

  process.exit(0);
}
main();
