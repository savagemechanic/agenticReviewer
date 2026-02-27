package ratelimit

import (
	"context"
	"sync"
	"time"
)

// MemoryLimiter implements Limiter using an in-memory sliding window.
//
// Data structure: map[string][]int64 where each value is a sorted slice of
// Unix timestamps (milliseconds) representing request times within the window.
//
// Algorithm (same O-complexity as the Redis sorted-set approach):
//   - On Check, binary-search for the window start and slice off expired entries.
//   - Count remaining entries to determine if the request is allowed.
//   - Append the current timestamp.
//
// Amortized time complexity: O(1) per Check under steady-state load.
// Space: O(maxRequests * keys) — bounded by the window size.
type MemoryLimiter struct {
	mu          sync.Mutex
	windows     map[string][]int64
	windowMs    int64
	maxRequests int64
}

// NewMemoryLimiter creates an in-memory sliding window rate limiter.
func NewMemoryLimiter(windowMs, maxRequests int64) *MemoryLimiter {
	return &MemoryLimiter{
		windows:     make(map[string][]int64),
		windowMs:    windowMs,
		maxRequests: maxRequests,
	}
}

func (m *MemoryLimiter) Check(_ context.Context, key string) (allowed bool, remaining int64, resetMs int64, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UnixMilli()
	windowStart := now - m.windowMs

	// Get or create the timestamps slice for this key.
	timestamps := m.windows[key]

	// Evict expired entries — find first index within window via linear scan.
	// Under steady load, most entries at the front are expired, so this is O(k)
	// where k is the number of expired entries (amortized O(1)).
	idx := 0
	for idx < len(timestamps) && timestamps[idx] <= windowStart {
		idx++
	}
	timestamps = timestamps[idx:]

	count := int64(len(timestamps))
	allowed = count < m.maxRequests

	if allowed {
		timestamps = append(timestamps, now)
		count++ // include the one we just added
	}

	m.windows[key] = timestamps

	remaining = m.maxRequests - count
	if remaining < 0 {
		remaining = 0
	}

	return allowed, remaining, m.windowMs, nil
}
