package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/google/uuid"
)

type videoRenderRequest struct {
	ProductID string `json:"productId"`
	Format    string `json:"format"`
}

type videoRenderResponse struct {
	VideoID   string `json:"videoId"`
	ProductID string `json:"productId"`
}

type rendererPayload struct {
	VideoID   string `json:"videoId"`
	ProductID string `json:"productId"`
	Format    string `json:"format"`
}

type rendererResult struct {
	StorageKey  string `json:"storageKey"`
	DurationSec int    `json:"durationSec"`
}

func handleVideoRender(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:video")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		body, err := decodeJSON[videoRenderRequest](r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		productID, err := parseUUID(body.ProductID)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		format := body.Format
		if format == "" {
			format = "youtube_long"
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

		video, err := deps.Store.InsertVideo(ctx, db.Video{
			ID:        uuid.New(),
			ProductID: productID,
			Status:    "rendering",
			Format:    &format,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		log.Info("rendering video", "videoId", video.ID.String(), "productId", productID.String(), "format", format)

		rendererURL := deps.Config.VideoRendererURL + "/render"
		payload, _ := json.Marshal(rendererPayload{
			VideoID:   video.ID.String(),
			ProductID: productID.String(),
			Format:    format,
		})

		resp, err := http.Post(rendererURL, "application/json", bytes.NewReader(payload))
		if err != nil {
			_ = deps.Store.UpdateVideoStatus(ctx, video.ID, "rejected")
			writeError(w, http.StatusBadGateway, fmt.Sprintf("video renderer error: %v", err))
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			_ = deps.Store.UpdateVideoStatus(ctx, video.ID, "rejected")
			respBody, _ := io.ReadAll(resp.Body)
			writeError(w, http.StatusBadGateway, fmt.Sprintf("video renderer returned %d: %s", resp.StatusCode, string(respBody)))
			return
		}

		var result rendererResult
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			_ = deps.Store.UpdateVideoStatus(ctx, video.ID, "rejected")
			writeError(w, http.StatusBadGateway, "invalid response from video renderer")
			return
		}

		_ = deps.Store.UpdateVideoRendered(ctx, video.ID, result.StorageKey, int32(result.DurationSec), format)
		_ = deps.Store.UpdateProductStatus(ctx, productID, "video_ready")

		_ = product // used for logging context
		writeSuccess(w, videoRenderResponse{
			VideoID:   video.ID.String(),
			ProductID: productID.String(),
		})
	}
}
