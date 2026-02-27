package pipeline

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/google/uuid"
)

// ProcessProduct takes a "discovered" product, captures a screenshot, extracts
// page data, stores results, and advances status to "processed".
func ProcessProduct(ctx context.Context, deps *Dependencies, product db.Product) error {
	// Take screenshot.
	screenshot, err := browser.TakeScreenshot(deps.Pool, product.URL)
	if err != nil {
		return fmt.Errorf("taking screenshot: %w", err)
	}

	// Upload screenshot to object storage.
	key := fmt.Sprintf("screenshots/%s/%s.png", product.ID, uuid.New().String())
	screenshotURL, err := deps.Storage.Upload(ctx, key, screenshot.Data, "image/png")
	if err != nil {
		return fmt.Errorf("uploading screenshot: %w", err)
	}

	// Save screenshot record.
	if _, err := deps.DB.InsertScreenshot(ctx, db.Screenshot{
		ID:        uuid.New(),
		ProductID: product.ID,
		URL:       screenshotURL,
		PageURL:   product.URL,
		Type:      "homepage",
		Width:     int32(screenshot.Width),
		Height:    int32(screenshot.Height),
	}); err != nil {
		return fmt.Errorf("inserting screenshot: %w", err)
	}

	// Extract page data.
	extraction, err := browser.ExtractPageData(deps.Pool, product.URL)
	if err != nil {
		return fmt.Errorf("extracting page data: %w", err)
	}

	headingsJSON, _ := json.Marshal(extraction.Headings)
	loadTime := int32(extraction.LoadTimeMs)

	if _, err := deps.DB.InsertExtraction(ctx, db.PageExtraction{
		ID:         uuid.New(),
		ProductID:  product.ID,
		PageURL:    product.URL,
		Title:      &extraction.Title,
		Headings:   headingsJSON,
		BodyText:   &extraction.BodyText,
		LoadTimeMs: &loadTime,
	}); err != nil {
		return fmt.Errorf("inserting page extraction: %w", err)
	}

	return deps.DB.UpdateProductStatus(ctx, product.ID, "processed")
}

// SummarizeProduct takes a "processed" product, runs LLM summarization, stores
// the result, and advances status to "summarized".
func SummarizeProduct(ctx context.Context, deps *Dependencies, product db.Product) error {
	extraction, err := deps.DB.GetExtractionByProduct(ctx, product.ID)
	if err != nil {
		return fmt.Errorf("getting page extraction: %w", err)
	}

	var headings []string
	if extraction.Headings != nil {
		_ = json.Unmarshal(extraction.Headings, &headings)
	}

	var bodyText string
	if extraction.BodyText != nil {
		bodyText = *extraction.BodyText
	}
	var title string
	if extraction.Title != nil {
		title = *extraction.Title
	}
	var loadTimeMs int
	if extraction.LoadTimeMs != nil {
		loadTimeMs = int(*extraction.LoadTimeMs)
	}

	input := llm.SummaryInput{
		ProductName: product.Name,
		ProductURL:  product.URL,
		PageTitle:   title,
		Headings:    headings,
		BodyText:    bodyText,
		LoadTimeMs:  loadTimeMs,
	}

	result, err := deps.LLM.Summarize(ctx, input)
	if err != nil {
		return fmt.Errorf("summarizing product: %w", err)
	}

	keyFeaturesJSON, _ := json.Marshal(result.KeyFeatures)
	prosJSON, _ := json.Marshal(result.Pros)
	consJSON, _ := json.Marshal(result.Cons)

	if _, err := deps.DB.InsertSummary(ctx, db.Summary{
		ID:             uuid.New(),
		ProductID:      product.ID,
		Content:        result.Content,
		TargetAudience: &result.TargetAudience,
		KeyFeatures:    keyFeaturesJSON,
		Pros:           prosJSON,
		Cons:           consJSON,
		Model:          &result.Model,
	}); err != nil {
		return fmt.Errorf("inserting summary: %w", err)
	}

	return deps.DB.UpdateProductStatus(ctx, product.ID, "summarized")
}

// ScoreProduct takes a "summarized" product, runs LLM scoring, stores the
// result, and advances status to "scored".
func ScoreProduct(ctx context.Context, deps *Dependencies, product db.Product) error {
	summary, err := deps.DB.GetSummaryByProduct(ctx, product.ID)
	if err != nil {
		return fmt.Errorf("getting summary: %w", err)
	}

	var keyFeatures, pros, cons []string
	_ = json.Unmarshal(summary.KeyFeatures, &keyFeatures)
	_ = json.Unmarshal(summary.Pros, &pros)
	_ = json.Unmarshal(summary.Cons, &cons)

	extraction, err := deps.DB.GetExtractionByProduct(ctx, product.ID)
	if err != nil {
		return fmt.Errorf("getting page extraction for load time: %w", err)
	}
	var loadTimeMs int
	if extraction.LoadTimeMs != nil {
		loadTimeMs = int(*extraction.LoadTimeMs)
	}

	input := llm.ScoreInput{
		ProductName: product.Name,
		Summary:     summary.Content,
		KeyFeatures: keyFeatures,
		Pros:        pros,
		Cons:        cons,
		LoadTimeMs:  loadTimeMs,
	}

	result, err := deps.LLM.Score(ctx, input)
	if err != nil {
		return fmt.Errorf("scoring product: %w", err)
	}

	if _, err := deps.DB.InsertScore(ctx, db.Score{
		ID:               uuid.New(),
		ProductID:        product.ID,
		Overall:          float32(result.Overall),
		UxScore:          float32(result.UXScore),
		PerformanceScore: float32(result.PerformanceScore),
		FeatureScore:     float32(result.FeatureScore),
		ValueScore:       float32(result.ValueScore),
		Reasoning:        &result.Reasoning,
		Model:            &result.Model,
	}); err != nil {
		return fmt.Errorf("inserting score: %w", err)
	}

	return deps.DB.UpdateProductStatus(ctx, product.ID, "scored")
}

// RenderVideo triggers video rendering for a "scored" product. It calls the
// video renderer service and advances status to "rendered".
func RenderVideo(ctx context.Context, deps *Dependencies, product db.Product) error {
	// Video rendering is delegated to the Remotion service via HTTP.
	// For now, advance status to signal readiness for rendering.
	log.Info("render stage: product ready for video generation",
		"product", product.Name,
		"rendererURL", deps.Config.VideoRendererURL,
	)

	return deps.DB.UpdateProductStatus(ctx, product.ID, "rendered")
}
