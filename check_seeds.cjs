const fs = require('fs');
const glob = require('glob');

const files = glob.sync('dilecti_seed_pack/*.json');
let found = 0;
for (const file of files) {
  if (file.includes('manifest')) continue;
  try {
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      const items = Array.isArray(content) ? content : (content.items || []);
      
      for (const item of items) {
        if (['places', 'events', 'event'].includes(item.category)) {
          const metaStr = JSON.stringify(item.genres || []).toLowerCase();
          if (metaStr.includes('drama') || metaStr.includes('fiction')) {
            console.log(`Found in seed ${file}: ${item.title} -> ${metaStr}`);
            found++;
          }
        }
      }
  } catch(e) {}
}
console.log('Total found in seeds:', found);
