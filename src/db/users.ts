import { db } from './index.js';
import { users } from './schema.js';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      displayName,
      photoUrl
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        displayName,
        photoUrl
      },
    })
    .returning();

  return result[0];
}
