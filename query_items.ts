import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const itemsSnap = await adminDb.collection('items').get();
  console.log('Total items in firestore:', itemsSnap.size);
  let count = 0;
  itemsSnap.forEach((doc: any) => {
    const data = doc.data();
    if (data.category === 'places' || data.category === 'events' || data.category === 'event') {
      const metaStr = JSON.stringify(data.metadata || {}).toLowerCase();
      if (metaStr.includes('drama') || metaStr.includes('fiction')) {
        console.log(`Wrong tags in ${data.category} / ${data.title}:`, data.metadata);
        count++;
      }
    }
  });
  console.log('Total wrong:', count);
}

main().catch(console.error).finally(() => process.exit(0));
