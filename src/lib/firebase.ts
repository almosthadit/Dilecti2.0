import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, disableNetwork, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  if (errInfo.error.includes('Missing or insufficient permissions')) {
    console.warn('Firestore Warning (Permissions): ', JSON.stringify(errInfo));
  } else if (errInfo.error.includes('resource-exhausted') || errInfo.error.includes('Quota limit exceeded')) {
    console.warn('Firestore Quota Exceeded: Daily write units exhausted. Going offline.');
    window.dispatchEvent(new CustomEvent('toast-alert', { detail: { message: 'Firestore Quota Exceeded: App is now in offline mode. Changes will save locally.', type: 'error' } }));
    disableNetwork(db).catch(console.warn);
  } else {
    console.warn('Firestore Error: ', JSON.stringify(errInfo));
  }
  // DO NOT THROW so the app doesn't crash here
}

