interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets: Record<string, Record<string, RateLimitBucket>> = {};

export function checkRateLimit(
  key: string,        // e.g. user_id or IP
  action: string,     // e.g. 'upload', 'process', 'ask'
  limit: number,      // max tokens
  intervalMs: number  // refill interval in ms
): { success: boolean; retryAfterSeconds: number } {
  if (!buckets[action]) {
    buckets[action] = {};
  }

  const now = Date.now();
  const bucket = buckets[action][key] || {
    tokens: limit,
    lastRefill: now
  };

  // Refill tokens based on time elapsed
  const elapsed = now - bucket.lastRefill;
  const refillRate = limit / intervalMs;
  const newTokens = Math.min(limit, bucket.tokens + elapsed * refillRate);

  bucket.tokens = newTokens;
  bucket.lastRefill = now;
  buckets[action][key] = bucket;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { success: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((1 - bucket.tokens) / refillRate / 1000));
  return { success: false, retryAfterSeconds };
}
