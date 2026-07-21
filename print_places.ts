import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      if (['places', 'events', 'event'].includes(data.category)) {
        console.log(`User ${userDoc.id} item ${itemDoc.id} (${data.category}): ${data.title} - ${JSON.stringify(data.metadata.genres)} - ${JSON.stringify(data.metadata.themes)}`);
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
