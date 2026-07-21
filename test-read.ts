import { adminDb } from './src/utils/firebaseAdmin';
async function test() {
  try {
    const s = await adminDb.collection('items').limit(1).get();
    console.log("Read success:", s.size);
  } catch(e) {
    console.error("Read fail", e);
  }
}
test();
