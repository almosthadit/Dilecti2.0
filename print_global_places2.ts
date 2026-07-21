import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const globalItemsSnap = await adminDb.collection('items').get();
  let count = 0;
  for (const itemDoc of globalItemsSnap.docs) {
    const data = itemDoc.data();
    if (['places', 'events', 'event'].includes(data.category)) {
      count++;
      if (count <= 10) {
        console.log(`${itemDoc.id} (${data.category}): ${data.title} - Genres: ${JSON.stringify(data.genres || data.metadata?.genres)}`);
      }
    }
  }
  console.log('Total places/events found:', count);
}
main().catch(console.error).finally(() => process.exit(0));
