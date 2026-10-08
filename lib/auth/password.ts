/**
 * Password Hashing Module
 *
 * Uses Argon2id for password hashing — the recommended algorithm
 * for password storage (OWASP, NIST).
 *
 * Security Controls:
 * - Argon2id variant (combines Argon2i + Argon2d resistance)
 * - Memory cost: 65536 KB (64 MB) — resists GPU attacks
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 * - Salt: automatically generated per hash
 *
 * NEVER:
 * - Store plaintext passwords
 * - Use MD5, SHA-1, SHA-256 alone for passwords
 * - Use bcrypt with low rounds
 * - Log password values
 */

import argon2 from 'argon2';

/** Argon2id hashing configuration */
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 threads
  hashLength: 32,       // 32-byte output
};

/**
 * Hash a plaintext password using Argon2id.
 *
 * @param password - The plaintext password to hash
 * @returns The Argon2id hash string (includes algorithm, params, salt, and hash)
 *
 * @example
 * const hash = await hashPassword('securePassword123!');
 * // Returns: '$argon2id$v=19$m=65536,t=3,p=4$...$...'
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 *
 * @param hash - The stored Argon2id hash
 * @param password - The plaintext password to verify
 * @returns true if the password matches the hash
 *
 * @example
 * const isValid = await verifyPassword(storedHash, 'securePassword123!');
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // If verification fails (e.g., corrupted hash), return false
    // Do not expose the error reason to callers
    return false;
  }
}

/**
 * Validate password strength.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 *
 * @param password - The password to validate
 * @returns An object with isValid and an array of validation errors
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
