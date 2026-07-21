import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  authError: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          // Ensure user profile exists in Firestore
          const userRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              displayName: u.displayName || "User",
              displayNameLower: (u.displayName || "User").toLowerCase(),
              photoURL: u.photoURL || "",
              createdAt: serverTimestamp()
            }, { merge: true });
          }
        } catch (err) {
          console.error("Failed to initialize user document:", err);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        // User closed the popup, do not show an error, just return.
        return;
      }
      console.error('Google Auth error.', error?.message);
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        setAuthError(`This domain is not authorized for Firebase Authentication.\n\nPlease go to your Firebase Console -> Authentication -> Settings -> Authorized Domains and add this domain:\n\n${window.location.hostname}`);
      } else if (error?.message?.includes('Cross-Origin') || error?.message?.includes('popup')) {
        setAuthError('Sign in failed. Are you in the preview iframe? Please click the "Open in new tab" icon (upward-right arrow) at the top right of the preview window to sign in on a full page.');
      } else {
        setAuthError(error?.message || 'Authentication failed. Please try again or open in a new tab.');
      }
      setLoading(false);
      return;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, loading, signIn, signOut, authError }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
