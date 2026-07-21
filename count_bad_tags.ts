import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  console.log(`Found ${users.docs.length} users in Firestore.`);
  
  let userItemsWrong = 0;
  let globalItemsWrong = 0;
  
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).where('category', 'in', ['places', 'events', 'event']).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      const metaStr = JSON.stringify(data.metadata || {}).toLowerCase();
      if (metaStr.includes('drama') || metaStr.includes('fiction')) {
        userItemsWrong++;
      }
    }
  }
  
  const globalItemsSnap = await adminDb.collection('items').where('category', 'in', ['places', 'events', 'event']).get();
  for (const itemDoc of globalItemsSnap.docs) {
      const data = itemDoc.data();
      const metaStr = JSON.stringify(data.metadata || {}).toLowerCase();
      if (metaStr.includes('drama') || metaStr.includes('fiction')) {
        globalItemsWrong++;
      }
  }
  
  console.log(`Wrong tags in User Items: ${userItemsWrong}`);
  console.log(`Wrong tags in Global Items (items collection): ${globalItemsWrong}`);
}
main().catch(console.error).finally(() => process.exit(0));
