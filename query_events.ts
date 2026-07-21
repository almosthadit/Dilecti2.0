import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  let count = 0;
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).where('category', '==', 'event').get();
    for (const itemDoc of itemsSnap.docs) {
      count++;
    }
  }
  console.log('Total event:', count);
}

main().catch(console.error).finally(() => process.exit(0));
