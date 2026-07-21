import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).where('category', 'in', ['places', 'events']).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      console.log(data.title, data.metadata.genres);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
