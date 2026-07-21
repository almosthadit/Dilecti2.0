import fs from 'fs';
import path from 'path';
import { db } from './src/db/index.js';
import { globalItems } from './src/db/schema.js';
import { getEmbedding } from './src/utils/embeddings.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const seedDir = path.join(process.cwd(), 'dilecti_seed_pack');
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.json') && f.includes('chunk')).sort();

  console.log(`Found ${files.length} chunk files.`);

  // Load existing IDs to skip and resume seamlessly
  console.log('Loading existing IDs to skip...');
  const existingRows = await db.execute(sql`SELECT id FROM global_items`);
  const existingIds = new Set(existingRows.rows.map(r => r.id));
  console.log(`Found ${existingIds.size} existing items. Skipping these...`);

  let totalProcessed = 0;
  let totalInserted = 0;

  for (const file of files) {
    console.log(`Processing ${file}...`);
    let content = fs.readFileSync(path.join(seedDir, file), 'utf-8');
    let items;
    try {
      items = JSON.parse(content);
    } catch(e) {
      console.error(`Error parsing ${file}`);
      continue;
    }
    
    // Free the raw string content memory
    content = null;

    if (!Array.isArray(items)) {
      items = items.items || [items];
    }

    // Process in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);
      const dbRecords = [];

      for (const item of batchItems) {
        if (!item.id) continue;
        if (existingIds.has(item.id)) {
          // Skip already inserted items to save memory and API calls
          continue;
        }
        
        const title = item.title || "";
        const subtitle = item.subtitle || "";
        const description = item.description || "";
        const category = item.category || "unknown";
        const genres = (item.genres || []).join(", ");
        const themes = (item.themes || []).join(", ");
        const tags = (item.tags || []).join(", ");
        
        // Weighting: Repeat title and themes to anchor the vector to core identity and mood, 
        // preventing the embedding from drifting based on tangential words in the description.
        const combinedText = `Title: ${title} ${title}. Category: ${category}. Genres: ${genres}. Themes: ${themes} ${themes}. Tags: ${tags}. Subtitle: ${subtitle}. Description: ${description}`.trim();
        const embedding = await getEmbedding(combinedText);

        dbRecords.push({
          id: item.id,
          title: title,
          subtitle: subtitle,
          description: description,
          category: category,
          embedding: embedding,
          data: item
        });
      }

      if (dbRecords.length > 0) {
        try {
          await db.insert(globalItems)
            .values(dbRecords)
            .onConflictDoUpdate({
              target: globalItems.id,
              set: {
                title: sql`EXCLUDED.title`,
                subtitle: sql`EXCLUDED.subtitle`,
                description: sql`EXCLUDED.description`,
                category: sql`EXCLUDED.category`,
                embedding: sql`EXCLUDED.embedding`,
                data: sql`EXCLUDED.data`
              }
            });
          totalInserted += dbRecords.length;
          
          // Add to existingIds so we don't insert again if duplicate in file
          dbRecords.forEach(r => existingIds.add(r.id));
        } catch(e) {
          console.error(`Error inserting batch in ${file}:`, e);
        }
      }
      totalProcessed += batchItems.length;
      console.log(`  Processed ${totalProcessed} items so far...`);
    }
    
    // Free memory explicitly after processing each file
    items = null;
    if (global.gc) {
      global.gc();
    }
  }

  console.log(`Done! Inserted/Updated ${totalInserted} items.`);
  
  // Verify count
  const result = await db.execute(sql`SELECT count(*) FROM global_items`);
  console.log(`Total items in DB: ${result.rows[0].count}`);
}

main().catch(console.error).finally(() => process.exit(0));
