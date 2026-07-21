import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const globalItemsSnap = await adminDb.collection('items').limit(5).get();
  console.log(`Global items collection has ${globalItemsSnap.docs.length} items (limit 5).`);
  for (const itemDoc of globalItemsSnap.docs) {
    const data = itemDoc.data();
    console.log(`${itemDoc.id} (${data.category}): ${data.title}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
