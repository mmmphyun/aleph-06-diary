import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDJiURN-HWZ1Bm4yAak2ftB4lxeiKNLc-c',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pds-diary-t06.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pds-diary-t06',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pds-diary-t06.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '939878421503',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:939878421503:web:3ccbf2d4fa8b52ae0c4dca',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  db = getFirestore(app);
}

export { app, db };
