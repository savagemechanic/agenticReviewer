package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/agenticreviewer/go-api/internal/logger"
)

type scoreRequest struct {
	ProductID string `json:"productId"`
	Force     bool   `json:"force"`
}

type scoreResponse struct {
	ProductID string `json:"productId"`
	Skipped   bool   `json:"skipped,omitempty"`
}

func handleScore(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:score")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		body, err := decodeJSON[scoreRequest](r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		productID, err := parseUUID(body.ProductID)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		product, err := deps.Store.GetProduct(ctx, productID)
		if err != nil {
			if isNotFound(err) {
				writeError(w, http.StatusNotFound, "Product not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// Duplicate check
		_, existsErr := deps.Store.GetScoreByProduct(ctx, productID)
		if existsErr == nil && !body.Force {
			writeSuccess(w, scoreResponse{ProductID: productID.String(), Skipped: true})
			return
		}

		summary, err := deps.Store.GetSummaryByProduct(ctx, productID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "No summary found")
			return
		}

		extraction, err := deps.Store.GetExtractionByProduct(ctx, productID)
		var loadTime int
		if err == nil && extraction.LoadTimeMs != nil {
			loadTime = int(*extraction.LoadTimeMs)
		}

		if deps.LLM == nil {
			writeError(w, http.StatusServiceUnavailable, "LLM client not configured")
			return
		}

		log.Info("scoring product", "productId", productID.String(), "name", product.Name)

		var keyFeatures, pros, cons []string
		_ = json.Unmarshal(summary.KeyFeatures, &keyFeatures)
		_ = json.Unmarshal(summary.Pros, &pros)
		_ = json.Unmarshal(summary.Cons, &cons)

		input := llm.ScoreInput{
			ProductName: product.Name,
			Summary:     summary.Content,
			KeyFeatures: keyFeatures,
			Pros:        pros,
			Cons:        cons,
			LoadTimeMs:  loadTime,
		}

		result, err := deps.LLM.Score(ctx, input)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("score: %v", err))
			return
		}

		if existsErr == nil {
			_ = deps.Store.DeleteScoreByProduct(ctx, productID)
		}

		_, _ = deps.Store.InsertScore(ctx, db.Score{
			ProductID:        productID,
			Overall:          float32(result.Overall),
			UxScore:          float32(result.UXScore),
			PerformanceScore: float32(result.PerformanceScore),
			FeatureScore:     float32(result.FeatureScore),
			ValueScore:       float32(result.ValueScore),
			Reasoning:        &result.Reasoning,
			Model:            &result.Model,
		})

		_ = deps.Store.UpdateProductStatus(ctx, productID, "scored")

		writeSuccess(w, scoreResponse{ProductID: productID.String()})
	}
}
