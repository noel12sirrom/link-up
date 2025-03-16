import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}');
  if (!firebaseConfig.projectId) {
    throw new Error('Firebase config is missing projectId');
  }
} catch (error) {
  console.error('Error parsing Firebase config:', error);
  console.log('Raw config:', process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
  throw error;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, db, storage };

export default app; 