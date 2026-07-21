import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  for (const userDoc of users.docs) {
    const listsSnap = await adminDb.collection(`users/${userDoc.id}/item_lists`).get();
    for (const doc of listsSnap.docs) {
      const data = doc.data();
      const items = data.items || [];
      console.log(`User ${userDoc.id} list ${doc.id} has ${items.length} items`);
      for (const item of items) {
        if (['places', 'events', 'event'].includes(item.category)) {
          const metaStr = JSON.stringify(item.metadata || {}).toLowerCase();
          if (metaStr.includes('drama') || metaStr.includes('fiction')) {
            console.log(`FOUND in list ${doc.id}: ${item.title}`);
          }
        }
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
