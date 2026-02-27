package browser

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
)

var log *slog.Logger = logger.New("browser")

// Pool manages a rod browser instance with concurrency control via a buffered
// channel semaphore. The semaphore acquire/release is O(1). The browser is
// recycled after maxPages navigations to prevent memory leaks — a pattern
// analogous to object pool recycling in systems design.
type Pool struct {
	mu           sync.Mutex
	browser      *rod.Browser
	semaphore    chan struct{}
	pageCount    int
	maxPages     int
	chromiumPath string
}

// NewPool creates a browser pool. maxConcurrent controls the semaphore size
// (buffered channel capacity). maxPagesBeforeRecycle triggers browser restart.
func NewPool(maxConcurrent, maxPagesBeforeRecycle int, chromiumPath string) *Pool {
	if maxPagesBeforeRecycle <= 0 {
		maxPagesBeforeRecycle = 10
	}
	return &Pool{
		semaphore:    make(chan struct{}, maxConcurrent),
		maxPages:     maxPagesBeforeRecycle,
		chromiumPath: chromiumPath,
	}
}

// ensureBrowser lazily starts or recycles the browser. Must be called under mu.
func (p *Pool) ensureBrowser() error {
	if p.browser != nil && p.pageCount < p.maxPages {
		return nil
	}

	if p.browser != nil {
		log.Info("recycling browser", "pageCount", p.pageCount)
		p.browser.MustClose()
		p.browser = nil
		p.pageCount = 0
	}

	l := launcher.New().
		Headless(true).
		Set("no-sandbox", "").
		Set("disable-gpu", "").
		Set("disable-dev-shm-usage", "")

	if p.chromiumPath != "" {
		l = l.Bin(p.chromiumPath)
	}

	controlURL, err := l.Launch()
	if err != nil {
		return fmt.Errorf("launching browser: %w", err)
	}

	b := rod.New().ControlURL(controlURL)
	if err := b.Connect(); err != nil {
		return fmt.Errorf("connecting to browser: %w", err)
	}

	p.browser = b
	log.Info("launched browser")
	return nil
}

// WithPage acquires a semaphore slot, obtains a page, calls fn, then cleans up.
// This is the single public entry point — callers never touch *rod.Page lifetimes.
func (p *Pool) WithPage(ctx context.Context, fn func(*rod.Page) error) error {
	// Acquire semaphore — blocks if all slots are taken.
	select {
	case p.semaphore <- struct{}{}:
	case <-ctx.Done():
		return ctx.Err()
	}
	defer func() { <-p.semaphore }()

	p.mu.Lock()
	if err := p.ensureBrowser(); err != nil {
		p.mu.Unlock()
		return err
	}
	page, err := p.browser.Page(proto.TargetCreateTarget{})
	if err != nil {
		p.mu.Unlock()
		return fmt.Errorf("creating page: %w", err)
	}
	p.pageCount++
	p.mu.Unlock()

	defer func() {
		if err := page.Close(); err != nil {
			log.Warn("failed to close page", "error", err)
		}
	}()

	return fn(page)
}

// Close shuts down the browser and drains the semaphore.
func (p *Pool) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.browser != nil {
		if err := p.browser.Close(); err != nil {
			return fmt.Errorf("closing browser: %w", err)
		}
		p.browser = nil
	}
	return nil
}
