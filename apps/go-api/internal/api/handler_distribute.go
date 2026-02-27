package api

import (
	"fmt"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/distribute"
	"github.com/agenticreviewer/go-api/internal/logger"
)

type distributeRequest struct {
	VideoID   string   `json:"videoId"`
	Platforms []string `json:"platforms"`
}

type distributionResult struct {
	Platform      string `json:"platform"`
	Status        string `json:"status"`
	PublicationID string `json:"publicationId"`
	Reason        string `json:"reason,omitempty"`
}

type distributeResponse struct {
	Results []distributionResult `json:"results"`
}

func handleDistribute(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:distribute")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		body, err := decodeJSON[distributeRequest](r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		videoID, err := parseUUID(body.VideoID)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		platforms := body.Platforms
		if len(platforms) == 0 {
			platforms = []string{"youtube"}
		}

		video, err := deps.Store.GetVideo(ctx, videoID)
		if err != nil {
			if isNotFound(err) {
				writeError(w, http.StatusNotFound, "Video not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if video.Status != "approved" {
			writeError(w, http.StatusBadRequest, "Video must be approved before distribution")
			return
		}

		log.Info("distributing video", "videoId", videoID.String(), "platforms", platforms)

		results := make([]distributionResult, 0, len(platforms))

		for _, platform := range platforms {
			pub, err := deps.Store.InsertPublication(ctx, db.Publication{
				VideoID:  videoID,
				Platform: platform,
				Status:   "pending",
			})
			if err != nil {
				results = append(results, distributionResult{
					Platform: platform,
					Status:   "failed",
					Reason:   err.Error(),
				})
				continue
			}

			if platform == "youtube" {
				if deps.Config.YouTubeClientID == "" || deps.Config.YouTubeClientSecret == "" || deps.Config.YouTubeRefreshToken == "" {
					errMsg := "YouTube credentials not configured"
					_ = deps.Store.UpdatePublicationStatus(ctx, pub.ID, "failed", &errMsg)
					results = append(results, distributionResult{
						Platform:      platform,
						Status:        "failed",
						PublicationID: pub.ID.String(),
						Reason:        errMsg,
					})
					continue
				}

				if video.StorageKey == nil {
					errMsg := "video has no storage key"
					_ = deps.Store.UpdatePublicationStatus(ctx, pub.ID, "failed", &errMsg)
					results = append(results, distributionResult{
						Platform:      platform,
						Status:        "failed",
						PublicationID: pub.ID.String(),
						Reason:        errMsg,
					})
					continue
				}

				videoData, err := deps.ObjStore.Download(ctx, *video.StorageKey)
				if err != nil {
					errMsg := fmt.Sprintf("download video: %v", err)
					_ = deps.Store.UpdatePublicationStatus(ctx, pub.ID, "failed", &errMsg)
					results = append(results, distributionResult{
						Platform:      platform,
						Status:        "failed",
						PublicationID: pub.ID.String(),
						Reason:        errMsg,
					})
					continue
				}

				product, _ := deps.Store.GetProduct(ctx, video.ProductID)
				title := fmt.Sprintf("Review: %s", product.Name)
				description := fmt.Sprintf("AI-generated review of %s by Agentic Reviewer", product.Name)
				tags := []string{"SaaS", "review", "B2B", product.Name}

				ytCfg := distribute.YouTubeConfig{
					ClientID:     deps.Config.YouTubeClientID,
					ClientSecret: deps.Config.YouTubeClientSecret,
					RefreshToken: deps.Config.YouTubeRefreshToken,
				}

				ytResult, err := distribute.UploadToYouTube(ctx, ytCfg, videoData, title, description, tags)
				if err != nil {
					errMsg := fmt.Sprintf("youtube upload: %v", err)
					_ = deps.Store.UpdatePublicationStatus(ctx, pub.ID, "failed", &errMsg)
					results = append(results, distributionResult{
						Platform:      platform,
						Status:        "failed",
						PublicationID: pub.ID.String(),
						Reason:        errMsg,
					})
					continue
				}

				_ = deps.Store.UpdatePublicationPublished(ctx, pub.ID, ytResult.VideoID, ytResult.URL)
				results = append(results, distributionResult{
					Platform:      platform,
					Status:        "published",
					PublicationID: pub.ID.String(),
				})
			} else {
				errMsg := fmt.Sprintf("%s distribution not configured", platform)
				_ = deps.Store.UpdatePublicationStatus(ctx, pub.ID, "failed", &errMsg)
				results = append(results, distributionResult{
					Platform:      platform,
					Status:        "skipped",
					PublicationID: pub.ID.String(),
					Reason:        "not configured",
				})
			}
		}

		// Update video/product status if any published.
		anyPublished := false
		for _, res := range results {
			if res.Status == "published" {
				anyPublished = true
				break
			}
		}
		if anyPublished {
			_ = deps.Store.UpdateVideoStatus(ctx, videoID, "published")
			_ = deps.Store.UpdateProductStatus(ctx, video.ProductID, "published")
		}

		writeSuccess(w, distributeResponse{Results: results})
	}
}
