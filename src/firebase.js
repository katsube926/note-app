import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDt7Y6Rp6BO_PMFC3EORlRKT8ydqKrtNgo",
  authDomain: "note-app-1e83b.firebaseapp.com",
  projectId: "note-app-1e83b",
  storageBucket: "note-app-1e83b.firebasestorage.app",
  messagingSenderId: "628730603976",
  appId: "1:628730603976:web:0009708585eddc4467b8fd"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 認証の永続性を設定
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app); 