import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  let userItemsWrong = 0;
  
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      if (['places', 'events', 'event'].includes(data.category)) {
        const metaStr = JSON.stringify(data.metadata || {}).toLowerCase();
        if (metaStr.includes('drama') || metaStr.includes('fiction') || metaStr.includes('non fiction') || metaStr.includes('non-fiction')) {
          userItemsWrong++;
          console.log(`User ${userDoc.id} item ${itemDoc.id} (${data.category}): ${data.title} - ${JSON.stringify(data.metadata.genres)}`);
        }
      }
    }
  }
  console.log(`Wrong tags in User Items: ${userItemsWrong}`);
}
main().catch(console.error).finally(() => process.exit(0));
