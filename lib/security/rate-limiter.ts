/**
 * Rate Limiter
 * 
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window algorithm to track request counts per IP.
 * 
 * For production, replace with Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Check rate limit for a given key (typically IP address).
 * 
 * @param key - Unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining count
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 900000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Rate limit specifically for login attempts.
 * Uses stricter limits than general API rate limiting.
 */
export function checkLoginRateLimit(ipAddress: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10);
  const windowMs = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10);
  return checkRateLimit(`login:${ipAddress}`, maxAttempts, windowMs);
}

/**
 * Clear all rate limits or a specific key.
 * Used for testing, recovery, and admin unlock.
 */
export function clearRateLimits(key?: string): void {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}

