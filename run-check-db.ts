import { adminDb } from './src/utils/firebaseAdmin.ts';
async function run() {
  const users = await adminDb.collection('users').where('email', '==', 'jplappert90@gmail.com').get();
  if (!users.docs.length) { console.log("No users"); return; }
  const userId = users.docs[0].id;
  const itemsSnap = await adminDb.collection('users/' + userId + '/items').get();
  for (const doc of itemsSnap.docs) {
    if (doc.data().category === 'food') console.log(doc.data().title);
  }
}
run().catch(console.error);
