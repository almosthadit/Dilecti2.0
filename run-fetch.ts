import { adminDb } from './src/utils/firebaseAdmin.ts';
import { fetchImageFor } from './src/utils/ai.ts';

async function run() {
  const users = await adminDb.collection('users').where('email', '==', 'jplappert90@gmail.com').get();
  if (!users.docs.length) return;
  const userId = users.docs[0].id;
  
  const itemsSnap = await adminDb.collection('users/' + userId + '/items').get();
  for (const doc of itemsSnap.docs) {
    const data = doc.data();
    if (data.category === 'food' && data.coverUrl && data.coverUrl.includes('unsplash.com')) {
       console.log("Refetching for", data.title);
       const newUrl = await fetchImageFor(data.title, data.subtitle || "", "food", false, 5000, "Austin, Texas"); 
       console.log("New URL:", newUrl);
       await adminDb.collection('users/' + userId + '/items').doc(doc.id).set({ coverUrl: newUrl || "" }, { merge: true });
    }
  }
}
run().catch(console.error);
