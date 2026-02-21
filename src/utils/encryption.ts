/**
 * Browser-based encryption utility using WebCrypto API
 * Encrypts/decrypts sensitive transaction data
 */

const ENCRYPTION_KEY_STORAGE = 'myledger_encryption_key';
const ENCRYPTION_KEY_EXPIRY = 'myledger_encryption_key_expiry';
const KEY_EXPIRY_HOURS = 8; // Key expires after 8 hours

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Generate a new encryption key and store it with expiry
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  const key = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  // Store key expiry time
  const expiryTime = new Date().getTime() + KEY_EXPIRY_HOURS * 60 * 60 * 1000;
  localStorage.setItem(ENCRYPTION_KEY_EXPIRY, expiryTime.toString());

  // Export and store key
  const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  const keyString = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  localStorage.setItem(ENCRYPTION_KEY_STORAGE, keyString);

  return key;
}

/**
 * Get the stored encryption key if it exists and hasn't expired
 */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const keyString = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  const expiryTimeStr = localStorage.getItem(ENCRYPTION_KEY_EXPIRY);

  if (!keyString || !expiryTimeStr) {
    return null;
  }

  // Check if key has expired
  const expiryTime = parseInt(expiryTimeStr, 10);
  if (new Date().getTime() > expiryTime) {
    clearEncryptionKey();
    return null;
  }

  // Import and return key
  const binaryString = atob(keyString);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const key = await window.crypto.subtle.importKey(
    'raw',
    bytes.buffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Check if encryption key exists and is valid
 */
export function isEncryptionKeyValid(): boolean {
  const keyString = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  const expiryTimeStr = localStorage.getItem(ENCRYPTION_KEY_EXPIRY);

  if (!keyString || !expiryTimeStr) {
    return false;
  }

  const expiryTime = parseInt(expiryTimeStr, 10);
  return new Date().getTime() <= expiryTime;
}

/**
 * Get remaining time for the encryption key in minutes
 */
export function getKeyExpiryMinutes(): number {
  const expiryTimeStr = localStorage.getItem(ENCRYPTION_KEY_EXPIRY);
  if (!expiryTimeStr) {
    return 0;
  }

  const expiryTime = parseInt(expiryTimeStr, 10);
  const remainingMs = expiryTime - new Date().getTime();
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return Math.max(0, remainingMinutes);
}

/**
 * Clear the stored encryption key
 */
export function clearEncryptionKey(): void {
  localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
  localStorage.removeItem(ENCRYPTION_KEY_EXPIRY);
}

/**
 * Encrypt a string using AES-GCM
 */
export async function encryptData(data: string, key: CryptoKey): Promise<EncryptedData> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

/**
 * Decrypt a string using AES-GCM
 */
export async function decryptData(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
  const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt multiple strings at once
 */
export async function encryptBatch(
  dataArray: string[],
  key: CryptoKey
): Promise<EncryptedData[]> {
  return Promise.all(dataArray.map(data => encryptData(data, key)));
}

/**
 * Decrypt multiple strings at once
 */
export async function decryptBatch(
  encryptedArray: EncryptedData[],
  key: CryptoKey
): Promise<string[]> {
  return Promise.all(encryptedArray.map(encrypted => decryptData(encrypted, key)));
}
