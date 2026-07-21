const fs = require('fs');
const glob = require('glob');

const files = glob.sync('dilecti_seed_pack/*.json');
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const items = data.items || (Array.isArray(data) ? data : [data]);
  
  for (const item of items) {
    if (['places', 'events', 'event'].includes(item.category)) {
      const metaStr = JSON.stringify(item.genres || []).toLowerCase();
      if (metaStr.includes('drama') || metaStr.includes('fiction')) {
        console.log(`Found in seed ${file}: ${item.title} -> ${metaStr}`);
      }
    }
  }
}
