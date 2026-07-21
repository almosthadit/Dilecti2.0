import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const users = await adminDb.collection('users').get();
  let count = 0;
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).where('category', 'in', ['food', 'product', 'products']).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      const metaStr = JSON.stringify(data.metadata || {}).toLowerCase();
      if (metaStr.includes('drama') || metaStr.includes('fiction')) {
        console.log(`Wrong tags in ${data.category} / ${data.title}:`, data.metadata);
        count++;
      }
    }
  }
  console.log('Total wrong in food/products:', count);
}

main().catch(console.error).finally(() => process.exit(0));
