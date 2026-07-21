// @ts-nocheck
import { initializeApp, getApps, credential } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

let databaseId = '';
try {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  databaseId = config.firestoreDatabaseId;
} catch (e) {
  databaseId = 'ai-studio-45a4f1a0-b66b-4671-95c5-d50c1f8384a3';
}

if (!getApps().length) {
  initializeApp({ projectId: "gen-lang-client-0481846593" });
}

const adminDb = getFirestore(getApps()[0], databaseId);

const MOCK_EMMA_ID = "mock-emma-watson-123";
const EMMA_PROFILE = {
   displayName: "Emma Watson",
   email: "emma@example.com",
   photoURL: "https://i.pravatar.cc/150?u=emma",
   demographics: {
      tags: ["Loves elegant cafes", "Reading fiction", "Indie pop"],
      genres: ["Sci-Fi", "Romance", "Alternative"]
   },
   preferences: "Books: The Secret History\nMovies: In the Mood for Love\nMusic: Taylor Swift",
};

const EMMA_ITEMS = [
  { title: 'The Secret History', subtitle: 'Donna Tartt', category: 'books', status: 'completed', rating: 9, review: 'Emotional, glamorous, unforgettable.', coverUrl: 'https://covers.openlibrary.org/b/id/12690987-L.jpg', isPrivate: false, dateAdded: Date.now() },
  { title: 'In the Mood for Love', subtitle: 'Wong Kar-wai', category: 'watch', status: 'completed', rating: 10, isPrivate: false, dateAdded: Date.now() },
  { title: 'Taylor Swift', subtitle: 'Artist', category: 'music', status: 'completed', rating: 10, isPrivate: false, dateAdded: Date.now() },
  { title: 'Omasake Sushi', subtitle: 'Tokyo', category: 'food', status: 'completed', rating: 10, isPrivate: false, dateAdded: Date.now() },
  { title: 'Stardew Valley', subtitle: 'ConcernedApe', category: 'games', status: 'completed', rating: 10, isPrivate: false, dateAdded: Date.now() }
];

async function seed() {
   await adminDb.collection("users").doc(MOCK_EMMA_ID).set(EMMA_PROFILE, { merge: true });
   
   for (const item of EMMA_ITEMS) {
      const docId = `${MOCK_EMMA_ID}_${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const docRef = adminDb.collection("users").doc(MOCK_EMMA_ID).collection("items").doc(docId);
      item.id = docId;
      await docRef.set(item, { merge: true });
   }
   console.log("Seeded Emma Watson!");
}

seed().catch(console.error);
