import { adminDb } from './src/utils/firebaseAdmin.ts';

async function main() {
  const globalItemsSnap = await adminDb.collection('items').where('category', 'in', ['places', 'events', 'event']).get();
  for (const itemDoc of globalItemsSnap.docs) {
    const data = itemDoc.data();
    console.log(`${itemDoc.id} (${data.category}): ${data.title} - Genres: ${JSON.stringify(data.genres || data.metadata?.genres)} - Themes: ${JSON.stringify(data.themes || data.metadata?.themes)}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
