package api

import (
	"encoding/json"
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/google/uuid"
)

type discoverRequest struct {
	Sources []string `json:"sources"`
}

type discoverResponse struct {
	ProductIDs []string      `json:"productIds"`
	RunID      uuid.UUID     `json:"runId"`
	Stats      discoverStats `json:"stats"`
}

type discoverStats struct {
	Found     int `json:"found"`
	New       int `json:"new"`
	Duplicate int `json:"duplicate"`
}

func handleListDiscoveryRuns(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		runs, err := deps.Store.ListDiscoveryRuns(ctx, 20, 0)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if runs == nil {
			runs = []db.DiscoveryRun{}
		}

		writeSuccess(w, runs)
	}
}

func handleDiscover(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:discover")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		var body discoverRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&body)
			r.Body.Close()
		}

		sourceLabel := "all"
		if len(body.Sources) > 0 {
			sourceLabel = ""
			for i, s := range body.Sources {
				if i > 0 {
					sourceLabel += ","
				}
				sourceLabel += s
			}
		}

		// Create discovery run via Store interface.
		run, err := deps.Store.InsertDiscoveryRun(ctx, db.DiscoveryRun{
			Source: sourceLabel,
			Status: "running",
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if deps.Browser == nil {
			_ = deps.Store.UpdateDiscoveryRunFailed(ctx, run.ID, "browser pool not configured")
			writeError(w, http.StatusServiceUnavailable, "browser pool not configured")
			return
		}

		log.Info("discovery started", "sources", sourceLabel, "runId", run.ID.String())

		// TODO: invoke browser crawlers.
		productIDs := make([]string, 0)

		_ = deps.Store.UpdateDiscoveryRunCompleted(ctx, run.ID, 0, 0)

		writeSuccess(w, discoverResponse{
			ProductIDs: productIDs,
			RunID:      run.ID,
			Stats: discoverStats{
				Found:     0,
				New:       0,
				Duplicate: 0,
			},
		})
	}
}
