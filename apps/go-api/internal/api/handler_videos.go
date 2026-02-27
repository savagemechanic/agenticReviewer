package api

import (
	"encoding/json"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/go-chi/chi/v5"
)

func handleListVideos(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		status := r.URL.Query().Get("status")

		var videos []db.VideoWithProduct
		var err error
		if status != "" {
			videos, err = deps.Store.ListVideosByStatus(ctx, status, 100, 0)
		} else {
			videos, err = deps.Store.ListVideos(ctx, 100, 0)
		}

		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if videos == nil {
			videos = []db.VideoWithProduct{}
		}

		writeSuccess(w, videos)
	}
}

func handleApproveVideo(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		idStr := chi.URLParam(r, "id")
		id, err := parseUUID(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		// Verify video exists.
		video, err := deps.Store.GetVideo(ctx, id)
		if err != nil {
			if isNotFound(err) {
				writeError(w, http.StatusNotFound, "Video not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if err := deps.Store.UpdateVideoStatus(ctx, id, "approved"); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		video.Status = "approved"
		writeSuccess(w, video)
	}
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func handleRejectVideo(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		idStr := chi.URLParam(r, "id")
		id, err := parseUUID(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var body rejectRequest
		_ = json.NewDecoder(r.Body).Decode(&body)

		video, err := deps.Store.GetVideo(ctx, id)
		if err != nil {
			if isNotFound(err) {
				writeError(w, http.StatusNotFound, "Video not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// Merge rejection reason into metadata.
		metaMap := make(map[string]interface{})
		if video.Metadata != nil {
			_ = json.Unmarshal(video.Metadata, &metaMap)
		}
		if body.Reason != "" {
			metaMap["rejectionReason"] = body.Reason
		}
		updatedMeta, _ := json.Marshal(metaMap)

		_ = deps.Store.UpdateVideoMetadata(ctx, id, updatedMeta)
		_ = deps.Store.UpdateVideoStatus(ctx, id, "rejected")

		video.Status = "rejected"
		video.Metadata = updatedMeta
		writeSuccess(w, video)
	}
}
