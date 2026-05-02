import CryptoJS from 'crypto-js';
import { INITIAL_STUDENT_DATA } from './data';
import { hashStudentId, encryptStudentData } from './encryption';

/**
 * Utility script to generate the encrypted dataset.
 * We run this once (or when data changes) to produce an object
 * where keys are HASHED student IDs and values are ENCRYPTED data blocks.
 */

export const generateEncryptedDataset = () => {
  const encryptedDatabase: Record<string, string> = {};

  for (const [studentId, data] of Object.entries(INITIAL_STUDENT_DATA)) {
    const hashedId = hashStudentId(studentId);
    
    let payloadToEncrypt: any = { ...data, id: studentId }; // Store the original ID for display if needed
    
    // If it's the instructor, bundle the full student list
    if (data.role === 'instructor') {
      const allStudents = Object.entries(INITIAL_STUDENT_DATA)
        .filter(([id, s]) => s.role !== 'instructor')
        .map(([id, s]) => ({ ...s, id }));
      payloadToEncrypt.students = allStudents;
    }

    // Encrypt the data payload itself using the raw studentId as the key
    // This means even if you have the hashed ID, you can't read the data
    const encryptedPayload = encryptStudentData(payloadToEncrypt, studentId);
    
    encryptedDatabase[hashedId] = encryptedPayload;
  }

  return encryptedDatabase;
};

// In a real application, you would log this out and save it to a file,
// then use that generated file as your source of truth instead of checking in
// the raw INITIAL_STUDENT_DATA. For this example, we generate it on demand.
export let ENCRYPTED_DATABASE = generateEncryptedDataset();

export const updateStudentFeedbackInDb = (updates: { id: string; feedback: string }[]) => {
  for (const update of updates) {
    if (INITIAL_STUDENT_DATA[update.id]) {
      INITIAL_STUDENT_DATA[update.id].feedback = update.feedback;
    }
  }
  ENCRYPTED_DATABASE = generateEncryptedDataset();
};

