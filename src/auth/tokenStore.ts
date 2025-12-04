/**
 * Secure token storage for Google SSO authentication
 *
 * Stores OAuth tokens and Metabase session data locally for persistent authentication.
 * Tokens are stored in a JSON file at the configured path (default: ~/.metabase-mcp/auth.json)
 */

import { readFile, writeFile, mkdir, unlink, access } from 'fs/promises';
import { dirname } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import config from '../config.js';
import type { StoredAuth, GoogleTokens } from '../types/auth.js';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const SALT = 'metabase-mcp-salt'; // Static salt - encryption is primarily for obfuscation
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Derive encryption key from machine-specific data
 * Note: This provides obfuscation, not strong security. For production use,
 * consider using system keychain (keytar) or similar secure storage.
 */
function deriveKey(): Buffer {
  // Use a combination of factors for key derivation
  const keyMaterial = `${process.env.USER || 'user'}-${config.METABASE_URL}`;
  return scryptSync(keyMaterial, SALT, KEY_LENGTH);
}

/**
 * Encrypt sensitive data before storage
 */
function encrypt(data: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt stored data
 */
function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const key = deriveKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * TokenStore class for managing persistent authentication
 */
export class TokenStore {
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || config.METABASE_AUTH_STORE_PATH;
  }

  /**
   * Save authentication data to disk
   */
  async save(auth: StoredAuth): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.storagePath);
    await mkdir(dir, { recursive: true });

    // Add timestamps
    const authWithTimestamps: StoredAuth = {
      ...auth,
      createdAt: auth.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // Encrypt and save
    const encrypted = encrypt(JSON.stringify(authWithTimestamps));
    await writeFile(this.storagePath, encrypted, { mode: 0o600 }); // User-only permissions
  }

  /**
   * Load authentication data from disk
   */
  async load(): Promise<StoredAuth | null> {
    if (!(await fileExists(this.storagePath))) {
      return null;
    }

    try {
      const encrypted = await readFile(this.storagePath, 'utf8');
      const decrypted = decrypt(encrypted);
      return JSON.parse(decrypted) as StoredAuth;
    } catch (error) {
      // If decryption fails (e.g., different user/machine), return null
      console.error('Failed to load stored auth:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Clear stored authentication data
   */
  async clear(): Promise<void> {
    if (await fileExists(this.storagePath)) {
      await unlink(this.storagePath);
    }
  }

  /**
   * Check if stored auth exists and is valid
   */
  async isValid(): Promise<boolean> {
    const auth = await this.load();

    if (!auth) {
      return false;
    }

    // Check if Metabase URL matches
    if (auth.metabaseUrl !== config.METABASE_URL) {
      return false;
    }

    // Check if session hasn't expired (with 1 hour buffer)
    const bufferMs = 60 * 60 * 1000; // 1 hour
    if (auth.sessionExpiresAt && Date.now() > auth.sessionExpiresAt - bufferMs) {
      return false;
    }

    return true;
  }

  /**
   * Get session token if valid
   */
  async getSessionToken(): Promise<string | null> {
    const auth = await this.load();

    if (!auth || auth.metabaseUrl !== config.METABASE_URL) {
      return null;
    }

    // Check session expiration
    if (auth.sessionExpiresAt && Date.now() > auth.sessionExpiresAt) {
      return null;
    }

    return auth.sessionToken;
  }

  /**
   * Get Google tokens for refresh
   */
  async getGoogleTokens(): Promise<GoogleTokens | null> {
    const auth = await this.load();
    return auth?.googleTokens || null;
  }

  /**
   * Update session token (after refresh)
   */
  async updateSession(sessionToken: string, expiresAt?: number): Promise<void> {
    const auth = await this.load();

    if (!auth) {
      throw new Error('No stored auth to update');
    }

    auth.sessionToken = sessionToken;
    if (expiresAt) {
      auth.sessionExpiresAt = expiresAt;
    }

    await this.save(auth);
  }

  /**
   * Get storage path (for display purposes)
   */
  getStoragePath(): string {
    return this.storagePath;
  }
}

// Default singleton instance
export const tokenStore = new TokenStore();

export default tokenStore;
