// ============================================
// SpotFish! — Simple In-Memory Rate Limiter
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
}

// Default configs for different endpoint types
export const RATE_LIMITS = {
  // Strict: auth endpoints
  auth: { windowMs: 15 * 60 * 1000, max: 10 },   // 10 req / 15 min
  // Medium: write operations
  write: { windowMs: 60 * 1000, max: 30 },         // 30 req / min
  // Lenient: read operations
  read: { windowMs: 60 * 1000, max: 100 },          // 100 req / min
  // Upload
  upload: { windowMs: 60 * 1000, max: 10 },         // 10 req / min
} as const;

/**
 * Check rate limit for a given key (typically IP + endpoint)
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Helper: apply rate limit to a Next.js route handler
 * Usage: const rateLimit = applyRateLimit(request, 'write');
 *        if (!rateLimit.allowed) return rateLimit.response;
 */
export function applyRateLimit(
  request: Request,
  type: keyof typeof RATE_LIMITS,
  customPath?: string
): { allowed: boolean; response?: Response } {
  const ip = getClientIp(request);
  const path = customPath || new URL(request.url).pathname;
  const key = `${ip}:${path}`;
  const config = RATE_LIMITS[type];

  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ error: 'Terlalu banyak request. Coba lagi nanti.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(config.max),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  return { allowed: true };
}
