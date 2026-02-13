export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

/** Minimal Redis-like interface for rate limiting */
export interface RedisLike {
  zremrangebyscore(key: string, min: number, max: number): Promise<unknown>;
  zcard(key: string): Promise<number>;
  zrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]>;
  zadd(key: string, score: number, member: string): Promise<unknown>;
  pexpire(key: string, ms: number): Promise<unknown>;
}

export function createRateLimiter(
  redis: RedisLike,
  options: RateLimiterOptions
): RateLimiter {
  const { windowMs, maxRequests } = options;

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;

      await redis.zremrangebyscore(redisKey, 0, windowStart);
      const count = await redis.zcard(redisKey);

      if (count >= maxRequests) {
        const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
        const resetMs = oldest.length > 0
          ? Math.max(0, parseInt(oldest[1]) + windowMs - now)
          : windowMs;

        return { allowed: false, remaining: 0, resetMs };
      }

      await redis.zadd(redisKey, now, `${now}-${Math.random()}`);
      await redis.pexpire(redisKey, windowMs);

      return { allowed: true, remaining: maxRequests - count - 1, resetMs: windowMs };
    },
  };
}
