import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const q = query(collection(db, 'items'), limit(1));
    const s = await getDocs(q);
    console.log("Read success:", s.size);
  } catch(e) {
    console.error("Read fail", e);
  }
  process.exit(0);
}
run();
