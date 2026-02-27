package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisLimiter implements Limiter using a sliding window backed by Redis sorted sets.
//
// Algorithm (same as the TypeScript implementation):
//  1. ZREMRANGEBYSCORE — evict entries outside the window  O(log n + k)
//  2. ZCARD           — count remaining entries            O(1)
//  3. ZADD            — add current timestamp              O(log n)
//  4. PEXPIRE         — set TTL on the key                 O(1)
//
// Total per-check: O(log n + k) where k is the number of expired entries.
// Under steady-state load, k is small, making this effectively O(log n).
//
// The sorted set score is the Unix timestamp in milliseconds. The member is
// a unique timestamp string to allow multiple requests in the same ms.
type RedisLimiter struct {
	client      *redis.Client
	windowMs    int64
	maxRequests int64
}

// NewRedisLimiter creates a sliding window rate limiter backed by Redis.
func NewRedisLimiter(client *redis.Client, windowMs, maxRequests int64) *RedisLimiter {
	return &RedisLimiter{
		client:      client,
		windowMs:    windowMs,
		maxRequests: maxRequests,
	}
}

func (l *RedisLimiter) Check(ctx context.Context, key string) (allowed bool, remaining int64, resetMs int64, err error) {
	now := time.Now().UnixMilli()
	windowStart := now - l.windowMs

	pipe := l.client.Pipeline()
	pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", windowStart))
	cardCmd := pipe.ZCard(ctx, key)
	member := fmt.Sprintf("%d-%d", now, now%1000)
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: member})
	pipe.PExpire(ctx, key, time.Duration(l.windowMs)*time.Millisecond)

	if _, err := pipe.Exec(ctx); err != nil {
		return false, 0, 0, fmt.Errorf("executing rate limit pipeline: %w", err)
	}

	count := cardCmd.Val()
	remaining = l.maxRequests - count - 1
	if remaining < 0 {
		remaining = 0
	}

	allowed = count < l.maxRequests
	resetMs = l.windowMs

	return allowed, remaining, resetMs, nil
}
