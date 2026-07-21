const admin = require('firebase-admin');

// Initialize Firebase Admin (assuming default credentials or standard initialization)
const serviceAccount = require('./firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fix() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', 'jplappert90@gmail.com').get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(async doc => {
    console.log(doc.id, '=>', doc.data());
    await db.collection('users').doc(doc.id).update({
      miniProfiles: {}
    });
    console.log("Cleared miniProfiles for", doc.id);
  });
}

fix().catch(console.error);
