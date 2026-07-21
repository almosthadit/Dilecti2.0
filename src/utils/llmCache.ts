import { adminDb } from "../utils/firebaseAdmin";

/**
 * Gets a cached LLM response
 */
export async function getCachedResponse(uid: string | 'global', key: string): Promise<any | null> {
  try {
    const cacheDoc = await adminDb.collection("users").doc(uid).collection("llm_cache").doc(key).get();
    if (cacheDoc.exists) {
      return cacheDoc.data();
    }
    return null;
  } catch (err) {
    console.error("Cache get error:", err);
    return null;
  }
}

/**
 * Sets a cached LLM response
 */
export async function setCachedResponse(uid: string | 'global', key: string, data: any, ttlDays: number = 7) {
  try {
    const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    await adminDb.collection("users").doc(uid).collection("llm_cache").doc(key).set({
      ...data,
      cashedAt: Date.now(),
      expiresAt,
    });
  } catch (err) {
    console.error("Cache set error:", err);
  }
}

/**
 * Deletes a cached key
 */
export async function clearCachedResponse(uid: string | 'global', key: string) {
  try {
    await adminDb.collection("users").doc(uid).collection("llm_cache").doc(key).delete();
  } catch (err) {
    console.error("Cache clear error", err);
  }
}
