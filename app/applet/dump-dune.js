import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// We need the user's ID
db.collection('users').where('email', '==', 'jplappert90@gmail.com').get().then(snapshot => {
  if (snapshot.empty) {
    console.log('No user found');
    process.exit(1);
  }
  const userId = snapshot.docs[0].id;
  console.log('User ID:', userId);

  db.collection(`users/${userId}/items`).get().then(itemsSnapshot => {
     const dune = itemsSnapshot.docs.map(d => d.data()).find(i => i.title && i.title.toLowerCase().includes('dune'));
     console.log('Dune item:', dune);
     process.exit(0);
  });
}).catch(e => {
  console.error(e);
  process.exit(1);
});
