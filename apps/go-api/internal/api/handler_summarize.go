package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/agenticreviewer/go-api/internal/logger"
)

type summarizeRequest struct {
	ProductID string `json:"productId"`
	Force     bool   `json:"force"`
}

type summarizeResponse struct {
	ProductID string `json:"productId"`
	Skipped   bool   `json:"skipped,omitempty"`
}

func handleSummarize(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:summarize")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		body, err := decodeJSON[summarizeRequest](r)
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
		_, existsErr := deps.Store.GetSummaryByProduct(ctx, productID)
		if existsErr == nil && !body.Force {
			writeSuccess(w, summarizeResponse{ProductID: productID.String(), Skipped: true})
			return
		}

		extraction, err := deps.Store.GetExtractionByProduct(ctx, productID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "No extraction found")
			return
		}

		if deps.LLM == nil {
			writeError(w, http.StatusServiceUnavailable, "LLM client not configured")
			return
		}

		log.Info("summarizing product", "productId", productID.String(), "name", product.Name)

		var headingsList []string
		if extraction.Headings != nil {
			_ = json.Unmarshal(extraction.Headings, &headingsList)
		}
		var bodyText string
		if extraction.BodyText != nil {
			bodyText = *extraction.BodyText
		}
		var title string
		if extraction.Title != nil {
			title = *extraction.Title
		}
		var loadTime int
		if extraction.LoadTimeMs != nil {
			loadTime = int(*extraction.LoadTimeMs)
		}

		input := llm.SummaryInput{
			ProductName: product.Name,
			ProductURL:  product.URL,
			PageTitle:   title,
			Headings:    headingsList,
			BodyText:    bodyText,
			LoadTimeMs:  loadTime,
		}

		result, err := deps.LLM.Summarize(ctx, input)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("summarize: %v", err))
			return
		}

		// If forcing, delete old summary first.
		if existsErr == nil {
			_ = deps.Store.DeleteSummaryByProduct(ctx, productID)
		}

		keyFeaturesJSON, _ := json.Marshal(result.KeyFeatures)
		prosJSON, _ := json.Marshal(result.Pros)
		consJSON, _ := json.Marshal(result.Cons)

		_, _ = deps.Store.InsertSummary(ctx, db.Summary{
			ProductID:      productID,
			Content:        result.Content,
			TargetAudience: &result.TargetAudience,
			KeyFeatures:    keyFeaturesJSON,
			Pros:           prosJSON,
			Cons:           consJSON,
			Model:          &result.Model,
		})

		_ = deps.Store.UpdateProductStatus(ctx, productID, "summarized")

		writeSuccess(w, summarizeResponse{ProductID: productID.String()})
	}
}
