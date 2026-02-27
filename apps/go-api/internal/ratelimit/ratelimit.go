package ratelimit

import "context"

// Limiter is the interface for rate limiting checks.
// Implementations: MemoryLimiter (in-process), RedisLimiter (distributed).
type Limiter interface {
	Check(ctx context.Context, key string) (allowed bool, remaining int64, resetMs int64, err error)
}
