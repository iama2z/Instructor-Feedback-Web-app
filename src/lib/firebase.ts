import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, getDocs, setDoc, doc, collection } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_STUDENT_DATA } from './data';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must specify firestoreDatabaseId when getting Firestore instance
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Bootstraps the Firestore database on first login by comparing local data.
 * Used when an instructor logs in to ensure they have the student records.
 */
export async function ensureDatabasePopulated() {
  try {
    const studentsSnap = await getDocs(collection(db, 'students'));
    if (studentsSnap.empty) {
      console.log('Bootstrapping Firestore with initial student data...');
      const promises = Object.entries(INITIAL_STUDENT_DATA)
        .filter(([id, data]) => data.role !== 'instructor')
        .map(([id, data]) => {
           return setDoc(doc(db, 'students', id), {
             name: data.name,
             period: data.period,
             feedback: data.feedback
           });
        });
      await Promise.all(promises);
      console.log('Bootstrapped successfully.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }
}

