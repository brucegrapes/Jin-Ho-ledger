/**
 * Server-side encryption utility using Node.js crypto module
 * Encrypts/decrypts sensitive transaction data before storing in database
 * Data is stored encrypted - NO plaintext stored in database
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'myledger-default-key-change-in-production-12345678';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Ensure key is 32 bytes (256 bits)
 */
function getKey(): Buffer {
  const hash = crypto.createHash('sha256');
  hash.update(ENCRYPTION_KEY);
  return hash.digest();
}

/**
 * Encrypt a string and return IV:ciphertext:authTag as base64
 * Returns null if input is null/empty
 */
export function encryptString(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return as base64 encoded: IV:ciphertext:authTag
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);
    return combined.toString('base64');
  } catch (err) {
    console.error('Encryption error:', err);
    return null;
  }
}

/**
 * Decrypt a string from IV:ciphertext:authTag base64 format
 * Returns null if input is null/empty or decryption fails
 */
export function decryptString(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;

  try {
    const combined = Buffer.from(encrypted, 'base64');

    // Extract IV, ciphertext, and authTag
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(combined.length - AUTH_TAG_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
}

/**
 * Encrypt multiple strings at once
 */
export function encryptBatch(items: (string | null | undefined)[]): (string | null)[] {
  return items.map(item => encryptString(item));
}

/**
 * Decrypt multiple strings at once
 */
export function decryptBatch(items: (string | null | undefined)[]): (string | null)[] {
  return items.map(item => decryptString(item));
}

/**
 * Encrypt transaction object's sensitive fields
 * Encrypts description and reference_number directly in-place
 */
export function encryptTransaction(transaction: any): any {
  return {
    ...transaction,
    description: transaction.description ? encryptString(transaction.description) : null,
    reference_number: transaction.reference_number ? encryptString(transaction.reference_number) : null,
  };
}

/**
 * Decrypt transaction object's sensitive fields
 * Decrypts description and reference_number directly in-place
 */
export function decryptTransaction(transaction: any): any {
  return {
    ...transaction,
    description: transaction.description ? decryptString(transaction.description) : null,
    reference_number: transaction.reference_number ? decryptString(transaction.reference_number) : null,
  };
}

/**
 * Encrypt an array of transactions
 */
export function encryptTransactions(transactions: any[]): any[] {
  return transactions.map(t => encryptTransaction(t));
}

/**
 * Decrypt an array of transactions
 */
export function decryptTransactions(transactions: any[]): any[] {
  return transactions.map(t => decryptTransaction(t));
}
