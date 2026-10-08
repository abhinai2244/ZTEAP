import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/auth/password';

describe('Password Module - Argon2id Security & Strength Validation', () => {
  it('hashes password with Argon2id and verifies correctly', async () => {
    const plaintext = 'SecurePass!2024';
    const hash = await hashPassword(plaintext);

    expect(hash).toContain('$argon2id$');
    const isMatch = await verifyPassword(hash, plaintext);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword(hash, 'WrongPassword123');
    expect(isWrongMatch).toBe(false);
  });

  it('rejects passwords that do not meet complexity requirements', () => {
    const weakPass = 'simple';
    const validation = validatePasswordStrength(weakPass);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('accepts strong passwords meeting all OWASP complexity standards', () => {
    const strongPass = 'Zt@pEnterprise2026!';
    const validation = validatePasswordStrength(strongPass);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
