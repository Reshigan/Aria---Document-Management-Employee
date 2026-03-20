import { Context, Next } from 'hono';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// In-memory sliding window rate limiter
// In production with multiple Workers instances, use Durable Objects or KV for shared state
const requestLog = new Map<string, number[]>();

function getClientIP(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    c.req.header('X-Real-IP') ||
    'unknown'
  );
}

function cleanupOldEntries(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

export function rateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const ip = getClientIP(c);
    const path = new URL(c.req.url).pathname;
    const key = `${ip}:${path}`;
    const windowMs = config.windowSeconds * 1000;
    const now = Date.now();

    let timestamps = requestLog.get(key) || [];
    timestamps = cleanupOldEntries(timestamps, windowMs);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);

      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(config.maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil((oldestInWindow + windowMs) / 1000)));

      return c.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retry_after: retryAfter,
        },
        429
      );
    }

    timestamps.push(now);
    requestLog.set(key, timestamps);

    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(config.maxRequests - timestamps.length));

    await next();
  };
}

// Periodic cleanup to prevent memory leaks (call on scheduled events)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxWindowMs = 300_000; // 5 minutes max window
  for (const [key, timestamps] of requestLog.entries()) {
    const filtered = timestamps.filter((t) => t > now - maxWindowMs);
    if (filtered.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, filtered);
    }
  }
}
