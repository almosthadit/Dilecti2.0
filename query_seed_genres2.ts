import fs from 'fs';
import path from 'path';

const seedDir = './dilecti_seed_pack';
const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.json') && f.includes('chunk'));

let catCounts: Record<string, number> = {};
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'));
  for (const item of content) {
    catCounts[item.category] = (catCounts[item.category] || 0) + 1;
    if (item.category === 'places' || item.category === 'events') {
      const meta = item.metadata || {};
      // console.log(item.title, meta.genres, meta.genre, meta.tags);
    }
  }
}
console.log('Categories:', catCounts);
