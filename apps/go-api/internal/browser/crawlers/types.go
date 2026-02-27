package crawlers

import (
	"net/url"
	"strings"
	"sync"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/logger"
)

var log = logger.New("crawlers")

// DiscoveredProduct represents a SaaS product found by a crawler.
type DiscoveredProduct struct {
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	Source      string `json:"source"`
}

// RunAllCrawlers executes all discovery crawlers concurrently and returns
// deduplicated results. Uses a fan-out/fan-in pattern — each crawler runs
// in its own goroutine, results merge into a shared slice under a mutex,
// then we deduplicate by normalized URL (O(n) with a hash set).
func RunAllCrawlers(pool *browser.Pool, apiToken string) []DiscoveredProduct {
	var (
		mu      sync.Mutex
		results []DiscoveredProduct
		wg      sync.WaitGroup
	)

	type crawlerFn func() ([]DiscoveredProduct, error)

	crawlers := []struct {
		name string
		fn   crawlerFn
	}{
		{"producthunt", func() ([]DiscoveredProduct, error) { return DiscoverFromProductHunt(pool, apiToken) }},
		{"reddit", func() ([]DiscoveredProduct, error) { return DiscoverFromReddit() }},
		{"hackernews", func() ([]DiscoveredProduct, error) { return DiscoverFromHackerNews() }},
	}

	wg.Add(len(crawlers))
	for _, c := range crawlers {
		go func(name string, fn crawlerFn) {
			defer wg.Done()
			products, err := fn()
			if err != nil {
				log.Warn("crawler failed", "crawler", name, "error", err)
				return
			}
			mu.Lock()
			results = append(results, products...)
			mu.Unlock()
			log.Info("crawler completed", "crawler", name, "count", len(products))
		}(c.name, c.fn)
	}

	wg.Wait()
	return deduplicateByURL(results)
}

// normalizeURL strips scheme, trailing slash, and lowercases the host for
// deduplication. This gives us O(1) lookups in the seen set.
func normalizeURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return strings.ToLower(rawURL)
	}
	host := strings.ToLower(parsed.Host)
	path := strings.TrimRight(parsed.Path, "/")
	return host + path
}

// deduplicateByURL removes duplicate products using a hash set on normalized URLs.
// Time complexity: O(n), space complexity: O(n).
func deduplicateByURL(products []DiscoveredProduct) []DiscoveredProduct {
	seen := make(map[string]struct{}, len(products))
	unique := make([]DiscoveredProduct, 0, len(products))

	for _, p := range products {
		key := normalizeURL(p.URL)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		unique = append(unique, p)
	}
	return unique
}
