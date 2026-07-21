import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  console.log('Total users:', users.docs.length);

  let foundWrong = 0;
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      if (data.category === 'places' || data.category === 'events') {
        const metaStr = JSON.stringify(data.metadata || {}).toLowerCase();
        if (metaStr.includes('drama') || metaStr.includes('fiction')) {
          console.log(`User ${userDoc.id} item ${itemDoc.id} (${data.category}): ${data.title} - ${JSON.stringify(data.metadata?.tags)}`);
          foundWrong++;
        }
      }
    }
  }
  console.log('Total wrong in firestore:', foundWrong);
}

main().catch(console.error).finally(() => process.exit(0));
