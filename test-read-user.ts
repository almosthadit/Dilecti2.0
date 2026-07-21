import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const s = await getDoc(doc(db, 'users', 'mock-user-123'));
    console.log("Read success", s.exists());
  } catch(e) {
    console.error("Read fail", e);
  }
  process.exit(0);
}
run();
