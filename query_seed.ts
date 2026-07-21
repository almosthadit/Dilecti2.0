import fs from 'fs';
import path from 'path';

const seedDir = './dilecti_seed_pack';
const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.json') && f.includes('chunk'));

let found = 0;
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'));
  for (const item of content) {
    if (item.category === 'places' || item.category === 'events') {
      const meta = item.metadata || {};
      const metaStr = JSON.stringify(meta).toLowerCase();
      if (metaStr.includes('drama') || metaStr.includes('fiction')) {
        console.log(`Found in seed ${file}: ${item.title}`);
        found++;
      }
    }
  }
}
console.log('Total in seeds:', found);
