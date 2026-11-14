import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
  storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: import.meta.env['VITE_FIREBASE_APP_ID'],
};
export const IS_MOCK_MODE = !config.apiKey || !config.projectId || !config.appId;
export function firebaseServices() {
  if (IS_MOCK_MODE) throw new Error('Firebase todavía no está configurado.');
  const app = getApps()[0] ?? initializeApp(config);
  return { db: getFirestore(app), auth: getAuth(app) };
}
