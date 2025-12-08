const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SHARED_APP_SECRET = 'bsn-blockchain-social-network-e2e-v1';

const keyCache = new Map<string, CryptoKey>();

async function deriveSharedKey(chatId: string): Promise<CryptoKey> {
  if (keyCache.has(chatId)) {
    return keyCache.get(chatId)!;
  }
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SHARED_APP_SECRET + chatId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  const salt = encoder.encode('bsn-e2e-salt-' + chatId);
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
  
  keyCache.set(chatId, key);
  return key;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const EncryptionService = {
  encrypt: async (plaintext: string, senderId: string, recipientId: string): Promise<string> => {
    try {
      // Normalize addresses to lowercase for consistent encryption keys
      const normalizedSenderId = senderId.toLowerCase();
      const normalizedRecipientId = recipientId.toLowerCase();
      const chatId = [normalizedSenderId, normalizedRecipientId].sort().join('_');
      const key = await deriveSharedKey(chatId);
      
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(plaintext);
      
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_ALGORITHM,
          iv: iv
        },
        key,
        plaintextBuffer
      );
      
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);
      
      return 'E2E:' + arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  },

  decrypt: async (encryptedData: string, senderId: string, recipientId: string): Promise<string> => {
    try {
      if (!encryptedData.startsWith('E2E:')) {
        return encryptedData;
      }
      
      // Normalize addresses to lowercase for consistent decryption keys
      const normalizedSenderId = senderId.toLowerCase();
      const normalizedRecipientId = recipientId.toLowerCase();
      const chatId = [normalizedSenderId, normalizedRecipientId].sort().join('_');
      const key = await deriveSharedKey(chatId);
      
      const combined = new Uint8Array(base64ToArrayBuffer(encryptedData.slice(4)));
      
      const iv = combined.slice(0, IV_LENGTH);
      const ciphertext = combined.slice(IV_LENGTH);
      
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_ALGORITHM,
          iv: iv
        },
        key,
        ciphertext
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(plaintextBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Encrypted message]';
    }
  },

  isEncrypted: (content: string): boolean => {
    return content.startsWith('E2E:');
  }
};
