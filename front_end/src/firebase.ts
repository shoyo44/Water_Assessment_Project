import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
const provider = new GoogleAuthProvider()

export const auth = app ? getAuth(app) : null

export type AuthUser = Pick<User, 'displayName' | 'email' | 'photoURL' | 'uid'>

export function listenToAuth(callback: (user: AuthUser | null) => void) {
  if (!auth) {
    callback(null)
    return () => undefined
  }

  return onAuthStateChanged(auth, callback)
}

export async function loginWithGoogle() {
  if (!auth) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in front_end/.env.')
  }

  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function getFirebaseIdToken() {
  if (!auth?.currentUser) {
    throw new Error('No Firebase user is signed in.')
  }

  return auth.currentUser.getIdToken()
}

export async function logout() {
  if (!auth) return
  await signOut(auth)
}
