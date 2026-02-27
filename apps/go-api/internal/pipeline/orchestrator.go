package pipeline

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/config"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/agenticreviewer/go-api/internal/storage"
)

var log *slog.Logger = logger.New("pipeline")

// Dependencies bundles everything the pipeline needs.
// Uses interfaces for db, storage to support both embedded and external backends.
type Dependencies struct {
	DB      db.Store
	Pool    *browser.Pool
	Storage storage.ObjectStore
	LLM     *llm.Client
	Config  config.Config
}

// StageResult records the outcome of processing one product through one stage.
type StageResult struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	Stage       string `json:"stage"`
	Status      string `json:"status"`
	Error       string `json:"error,omitempty"`
}

// stageTransition maps a product status to the pipeline stage that advances it.
type stageTransition struct {
	status string
	stage  string
	fn     func(ctx context.Context, deps *Dependencies, product db.Product) error
}

// stages defines the pipeline progression order. Each product passes through
// these stages sequentially — this is a linear pipeline, O(stages * products).
var stages = []stageTransition{
	{status: "discovered", stage: "process", fn: ProcessProduct},
	{status: "processed", stage: "summarize", fn: SummarizeProduct},
	{status: "summarized", stage: "score", fn: ScoreProduct},
	{status: "scored", stage: "render", fn: RenderVideo},
}

// ProcessAll iterates all products that are eligible for advancement and runs
// them through the next pipeline stage. Returns results for each attempt.
func ProcessAll(ctx context.Context, deps *Dependencies) ([]StageResult, error) {
	var results []StageResult

	for _, st := range stages {
		products, err := deps.DB.ListProductsByStatus(ctx, st.status, 100, 0)
		if err != nil {
			return results, fmt.Errorf("listing products with status %q: %w", st.status, err)
		}

		if len(products) > 0 {
			log.Info("processing stage", "stage", st.stage, "count", len(products))
		}

		for _, product := range products {
			result := StageResult{
				ProductID:   product.ID.String(),
				ProductName: product.Name,
				Stage:       st.stage,
			}

			if err := st.fn(ctx, deps, product); err != nil {
				result.Status = "error"
				result.Error = err.Error()
				log.Error("stage failed",
					"stage", st.stage,
					"product", product.Name,
					"error", err,
				)
			} else {
				result.Status = "success"
				log.Info("stage completed",
					"stage", st.stage,
					"product", product.Name,
				)
			}

			results = append(results, result)
		}
	}

	return results, nil
}
