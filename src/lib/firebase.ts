import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';

const env = import.meta.env;
const useEmulator = env.VITE_USE_EMULATOR === 'true';

export const firebaseConfigured = Boolean(env.VITE_FIREBASE_DATABASE_URL) || useEmulator;

// In emulator mode always use the demo project, even if real keys are present in .env.local.
const app = initializeApp(
  useEmulator
    ? { apiKey: 'demo-key', projectId: 'demo-quizlive', databaseURL: 'http://127.0.0.1:9000?ns=demo-quizlive-default-rtdb' }
    : {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: env.VITE_FIREBASE_DATABASE_URL,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      },
);

export const auth = getAuth(app);
export const db = getDatabase(app);

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}
