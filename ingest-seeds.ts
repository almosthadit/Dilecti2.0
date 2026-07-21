import fs from 'fs';
import path from 'path';

import { adminDb } from './src/utils/firebaseAdmin';

async function run() {
  const seedDir = path.join(process.cwd(), 'dilecti_seed_pack');
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.json') && !f.includes('manifest') && f !== "all_dilecti_seed_items.json");
  // Excluded all_dilecti_seed_items.json to prevent duplicate processing if it's a combined file
  
  console.log(`Found ${files.length} seed files.`);
  let totalImported = 0;

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const content = fs.readFileSync(path.join(seedDir, file), 'utf-8');
    let items;
    try {
        items = JSON.parse(content);
    } catch(e) {
        console.error(`Error parsing ${file}`);
        continue;
    }
    
    if (!Array.isArray(items)) {
       if (items.items && Array.isArray(items.items)) {
           items = items.items;
       } else {
           items = [items];
       }
    }

    const batch = adminDb.batch();
    let batchCount = 0;
    
    for (const item of items) {
      if (!item.id) continue;
      
      const docRef = adminDb.collection('items').doc(item.id);
      batch.set(docRef, item, { merge: true });
      batchCount++;
      totalImported++;
      
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    console.log(`Finished ${file}.`);
  }
  
  console.log(`Done! Total items imported: ${totalImported}`);
}

run().catch(console.error);
