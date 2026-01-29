import crypto from 'crypto';

/**
 * AES-256-GCM encryption and decryption utilities
 */
export class CryptoEngine {
  private key: Buffer;
  private salt: Buffer;
  
  constructor(password: string, salt?: Buffer) {
    // Use provided salt or generate a random one
    this.salt = salt || Buffer.from('sdm-tcp-default-salt'); // Default for backwards compatibility
    // Derive a 256-bit key from password using PBKDF2
    this.key = crypto.pbkdf2Sync(password, this.salt, 100000, 32, 'sha256');
  }

  /**
   * Get the salt used for key derivation
   */
  getSalt(): Buffer {
    return this.salt;
  }

  /**
   * Generate a random salt for secure key derivation
   */
  static generateSalt(): Buffer {
    return crypto.randomBytes(16);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param data Data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  encrypt(data: Buffer): Buffer {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Return: [IV (12 bytes) | Auth Tag (16 bytes) | Encrypted Data]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedData Encrypted data with IV and auth tag
   * @returns Decrypted data
   */
  decrypt(encryptedData: Buffer): Buffer {
    if (encryptedData.length < 28) {
      throw new Error('Invalid encrypted data');
    }

    const iv = encryptedData.subarray(0, 12);
    const authTag = encryptedData.subarray(12, 28);
    const encrypted = encryptedData.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Generate a random key for session-based encryption
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
