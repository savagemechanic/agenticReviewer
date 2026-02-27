package browser

import (
	"context"
	"fmt"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// ScreenshotResult holds the captured PNG data and viewport dimensions.
type ScreenshotResult struct {
	Data   []byte
	Width  int
	Height int
}

// TakeScreenshot navigates to url at 1280x720 and captures a full-page PNG.
func TakeScreenshot(pool *Pool, url string) (ScreenshotResult, error) {
	const (
		viewportWidth  = 1280
		viewportHeight = 720
	)

	var result ScreenshotResult

	err := pool.WithPage(context.Background(), func(page *rod.Page) error {
		if err := page.SetViewport(&proto.EmulationSetDeviceMetricsOverride{
			Width:  viewportWidth,
			Height: viewportHeight,
		}); err != nil {
			return fmt.Errorf("setting viewport: %w", err)
		}

		if err := page.Navigate(url); err != nil {
			return fmt.Errorf("navigating to %q: %w", url, err)
		}
		if err := page.WaitStable(300); err != nil {
			return fmt.Errorf("waiting for page stable: %w", err)
		}

		data, err := page.Screenshot(true, &proto.PageCaptureScreenshot{
			Format: proto.PageCaptureScreenshotFormatPng,
		})
		if err != nil {
			return fmt.Errorf("taking screenshot: %w", err)
		}

		result = ScreenshotResult{
			Data:   data,
			Width:  viewportWidth,
			Height: viewportHeight,
		}
		return nil
	})

	return result, err
}
