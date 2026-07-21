import { adminDb } from './src/utils/firebaseAdmin';

async function test() {
  const snapshot = await adminDb.collection("ratings").limit(10).get();
  snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.itemDetails) {
          console.log(data.itemDetails.title, data.itemDetails.coverUrl);
      }
  });
}
test();
