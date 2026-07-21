import { adminDb } from './src/utils/firebaseAdmin.ts';
async function run() {
  const users = await adminDb.collection('users').where('email', '==', 'jplappert90@gmail.com').get();
  if (!users.docs.length) return;
  const userId = users.docs[0].id;
  const itemsSnap = await adminDb.collection('users/' + userId + '/items').get();
  for (const doc of itemsSnap.docs) {
    const data = doc.data();
    if (data.category === 'food') {
       console.log(data.title, data.coverUrl);
    }
  }
}
run().catch(console.error);
