import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function run() {
  try {
    const app = initializeApp();
    const db = getFirestore(app);
    // test write to a mock user
    await db.collection('users').doc('mock-user-test-admin').collection('items').doc('test').set({ name: 'test' });
    console.log("Write success with Application Default Credentials");
  } catch (e) {
    console.error("Failed to write:", e);
  }
}
run();
