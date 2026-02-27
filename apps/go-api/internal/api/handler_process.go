package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/google/uuid"
)

type processRequest struct {
	ProductID string `json:"productId"`
}

type processResponse struct {
	ProductID     string                `json:"productId"`
	Timing        *browser.TimingResult `json:"timing,omitempty"`
	ScreenshotURL string               `json:"screenshotUrl,omitempty"`
}

func handleProcess(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:process")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		body, err := decodeJSON[processRequest](r)
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

		_ = deps.Store.UpdateProductStatus(ctx, productID, "processing")

		if deps.Browser == nil || deps.ObjStore == nil {
			_ = deps.Store.UpdateProductStatus(ctx, productID, "discovered")
			writeError(w, http.StatusServiceUnavailable, "browser or storage not configured")
			return
		}

		log.Info("processing product", "productId", productID.String(), "name", product.Name)

		screenshot, err := browser.TakeScreenshot(deps.Browser, product.URL)
		if err != nil {
			_ = deps.Store.UpdateProductStatus(ctx, productID, "discovered")
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("screenshot: %v", err))
			return
		}

		key := fmt.Sprintf("screenshots/%s/%s.png", productID.String(), uuid.New().String())
		screenshotURL, err := deps.ObjStore.Upload(ctx, key, screenshot.Data, "image/png")
		if err != nil {
			_ = deps.Store.UpdateProductStatus(ctx, productID, "discovered")
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("upload screenshot: %v", err))
			return
		}

		_, _ = deps.Store.InsertScreenshot(ctx, db.Screenshot{
			ProductID: productID,
			URL:       screenshotURL,
			PageURL:   product.URL,
			Type:      "homepage",
			Width:     int32(screenshot.Width),
			Height:    int32(screenshot.Height),
		})

		extraction, err := browser.ExtractPageData(deps.Browser, product.URL)
		if err != nil {
			log.Warn("page extraction failed, continuing", "error", err)
		} else {
			headingsJSON, _ := json.Marshal(extraction.Headings)
			loadTime := int32(extraction.LoadTimeMs)
			_, _ = deps.Store.InsertExtraction(ctx, db.PageExtraction{
				ProductID:  productID,
				PageURL:    product.URL,
				Title:      &extraction.Title,
				Headings:   headingsJSON,
				BodyText:   &extraction.BodyText,
				LoadTimeMs: &loadTime,
			})
		}

		timing, timingErr := browser.MeasureTiming(deps.Browser, product.URL)

		_ = deps.Store.UpdateProductStatus(ctx, productID, "processed")

		resp := processResponse{
			ProductID:     productID.String(),
			ScreenshotURL: screenshotURL,
		}
		if timingErr == nil {
			resp.Timing = &timing
		}
		writeSuccess(w, resp)
	}
}
