import fs from 'fs';
import path from 'path';

const seedDir = './dilecti_seed_pack';
const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.json') && f.includes('chunk'));

let uniqueGenres = new Set<string>();
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'));
  for (const item of content) {
    if (item.category === 'places' || item.category === 'event') {
      const meta = item.metadata || {};
      const genres = meta.genre || meta.genres || [];
      if (Array.isArray(genres)) {
        genres.forEach((g: string) => uniqueGenres.add(g));
      } else {
        uniqueGenres.add(genres);
      }
    }
  }
}
console.log('Unique Genres for Places/Events in Seeds:', Array.from(uniqueGenres).join(', '));
