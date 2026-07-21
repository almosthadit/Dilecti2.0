import fs from 'fs';
import path from 'path';

const seedDir = './dilecti_seed_pack';
const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.json') && f.includes('chunk'));

let count = 0;
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'));
  for (const item of content) {
    if (item.category === 'places' || item.category === 'event') {
      console.log(item.category, item.title, Object.keys(item.metadata || {}));
      count++;
      if (count > 10) process.exit(0);
    }
  }
}
