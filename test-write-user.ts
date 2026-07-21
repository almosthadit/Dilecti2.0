import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    await setDoc(doc(db, 'users', 'mock-user-123'), {
      createdAt: new Date(),
      handle: "test",
      accountType: "free"
    });
    console.log("Write success");
  } catch(e) {
    console.error("Write fail", e);
  }
  process.exit(0);
}
run();
