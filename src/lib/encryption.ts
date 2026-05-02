import CryptoJS from 'crypto-js';

/**
 * Hashes a student ID so that the IDs themselves are not exposed in the source code.
 */
export const hashStudentId = (id: string): string => {
  return CryptoJS.SHA256(id.trim().toUpperCase()).toString(CryptoJS.enc.Hex);
};

/**
 * Encrypts a student's data payload using their ID as the decryption key.
 */
export const encryptStudentData = (data: any, secretKey: string): string => {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, secretKey.trim().toUpperCase()).toString();
};

/**
 * Decrypts a student's data payload using their ID.
 * Returns null if the decryption fails (e.g., wrong key).
 */
export const decryptStudentData = (ciphertext: string, secretKey: string): any | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey.trim().toUpperCase());
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) return null;
    
    return JSON.parse(decryptedString);
  } catch (error) {
    // Decryption failed (likely due to wrong key/padding)
    return null;
  }
};
