package llm

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// RetryOptions configures the exponential backoff retry strategy.
type RetryOptions struct {
	MaxAttempts int
	BaseDelay   time.Duration
	MaxDelay    time.Duration
}

// DefaultRetryOptions returns sensible defaults: 3 attempts, 1s base, 10s max.
func DefaultRetryOptions() RetryOptions {
	return RetryOptions{
		MaxAttempts: 3,
		BaseDelay:   1 * time.Second,
		MaxDelay:    10 * time.Second,
	}
}

// HTTPError captures an HTTP status code for retry decisions.
type HTTPError struct {
	StatusCode int
	RetryAfter time.Duration
	Err        error
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %v", e.StatusCode, e.Err)
}

func (e *HTTPError) Unwrap() error {
	return e.Err
}

// WithRetry executes fn with exponential backoff. Generic over return type T.
//
// Backoff formula: baseDelay * (1 << attempt), capped at maxDelay.
// This is exponential backoff — each retry doubles the wait time, giving
// O(2^n) growth bounded by maxDelay. Total worst-case wait is
// sum(min(base * 2^i, max)) for i in 0..attempts-1.
//
// Retry policy:
//   - 429 (rate limited): always retry, respect Retry-After header
//   - Other 4xx: do NOT retry (client errors won't self-resolve)
//   - 5xx and network errors: retry
func WithRetry[T any](ctx context.Context, fn func() (T, error), opts RetryOptions) (T, error) {
	if opts.MaxAttempts <= 0 {
		opts.MaxAttempts = 3
	}
	if opts.BaseDelay <= 0 {
		opts.BaseDelay = 1 * time.Second
	}
	if opts.MaxDelay <= 0 {
		opts.MaxDelay = 10 * time.Second
	}

	var zero T
	var lastErr error

	for attempt := 0; attempt < opts.MaxAttempts; attempt++ {
		result, err := fn()
		if err == nil {
			return result, nil
		}
		lastErr = err

		// Check if this is an HTTP error to decide retry strategy.
		var httpErr *HTTPError
		if errors.As(err, &httpErr) {
			// 4xx errors (except 429) are not retryable.
			if httpErr.StatusCode >= http.StatusBadRequest &&
				httpErr.StatusCode < http.StatusInternalServerError &&
				httpErr.StatusCode != http.StatusTooManyRequests {
				return zero, err
			}

			// Respect Retry-After for 429.
			if httpErr.StatusCode == http.StatusTooManyRequests && httpErr.RetryAfter > 0 {
				if err := sleep(ctx, httpErr.RetryAfter); err != nil {
					return zero, err
				}
				continue
			}
		}

		// Last attempt — don't sleep.
		if attempt == opts.MaxAttempts-1 {
			break
		}

		// Exponential backoff: base * 2^attempt, capped at max.
		delay := opts.BaseDelay * (1 << uint(attempt))
		if delay > opts.MaxDelay {
			delay = opts.MaxDelay
		}

		log.Warn("retrying after error",
			"attempt", attempt+1,
			"maxAttempts", opts.MaxAttempts,
			"delay", delay,
			"error", err,
		)

		if err := sleep(ctx, delay); err != nil {
			return zero, err
		}
	}

	return zero, fmt.Errorf("all %d attempts failed, last error: %w", opts.MaxAttempts, lastErr)
}

// ParseRetryAfter extracts a duration from a Retry-After header value.
func ParseRetryAfter(value string) time.Duration {
	if value == "" {
		return 0
	}
	seconds, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0
	}
	return time.Duration(seconds * float64(time.Second))
}

func sleep(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
