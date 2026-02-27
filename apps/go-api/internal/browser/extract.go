package browser

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// ExtractionResult holds structured data extracted from a web page.
type ExtractionResult struct {
	Title      string
	Headings   []string
	BodyText   string
	LoadTimeMs int
}

// ExtractPageData navigates to url and extracts title, headings, body text,
// and load time via DOM queries.
func ExtractPageData(pool *Pool, url string) (ExtractionResult, error) {
	var result ExtractionResult

	err := pool.WithPage(context.Background(), func(page *rod.Page) error {
		start := time.Now()

		if err := page.Navigate(url); err != nil {
			return fmt.Errorf("navigating to %q: %w", url, err)
		}
		if err := page.WaitStable(300); err != nil {
			return fmt.Errorf("waiting for page stable: %w", err)
		}

		result.LoadTimeMs = int(time.Since(start).Milliseconds())

		// Title
		title, err := page.Eval(`() => document.title`)
		if err == nil {
			result.Title = title.Value.Str()
		}

		// Headings (h1-h3)
		headings, err := page.Elements("h1, h2, h3")
		if err == nil {
			for _, h := range headings {
				text, _ := h.Text()
				trimmed := strings.TrimSpace(text)
				if trimmed != "" {
					result.Headings = append(result.Headings, trimmed)
				}
			}
		}

		// Body text
		body, err := page.Eval(`() => document.body ? document.body.innerText : ""`)
		if err == nil {
			result.BodyText = body.Value.Str()
		}

		return nil
	})

	return result, err
}

// TimingResult holds web performance timing metrics in milliseconds.
// These map to the Navigation Timing API — useful for performance scoring.
type TimingResult struct {
	TTFB             float64
	FCP              float64
	DOMContentLoaded float64
	Load             float64
}

// MeasureTiming navigates to url and extracts Navigation Timing API metrics.
func MeasureTiming(pool *Pool, url string) (TimingResult, error) {
	var result TimingResult

	err := pool.WithPage(context.Background(), func(page *rod.Page) error {
		if err := page.SetViewport(&proto.EmulationSetDeviceMetricsOverride{
			Width:  1280,
			Height: 720,
		}); err != nil {
			return fmt.Errorf("setting viewport: %w", err)
		}

		if err := page.Navigate(url); err != nil {
			return fmt.Errorf("navigating to %q: %w", url, err)
		}
		if err := page.WaitStable(500); err != nil {
			return fmt.Errorf("waiting for page stable: %w", err)
		}

		// Extract Navigation Timing API values.
		timing, err := page.Eval(`() => {
			const p = performance.getEntriesByType('navigation')[0];
			if (!p) return null;
			return {
				ttfb: p.responseStart - p.requestStart,
				domContentLoaded: p.domContentLoadedEventEnd - p.startTime,
				load: p.loadEventEnd - p.startTime
			};
		}`)
		if err == nil && timing.Value.Val() != nil {
			m := timing.Value.Map()
			if v, ok := m["ttfb"]; ok {
				result.TTFB = v.Num()
			}
			if v, ok := m["domContentLoaded"]; ok {
				result.DOMContentLoaded = v.Num()
			}
			if v, ok := m["load"]; ok {
				result.Load = v.Num()
			}
		}

		// First Contentful Paint from paint entries.
		fcp, err := page.Eval(`() => {
			const entries = performance.getEntriesByName('first-contentful-paint');
			return entries.length > 0 ? entries[0].startTime : 0;
		}`)
		if err == nil {
			result.FCP = fcp.Value.Num()
		}

		return nil
	})

	return result, err
}
