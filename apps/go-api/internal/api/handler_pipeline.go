package api

import (
	"net/http"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/agenticreviewer/go-api/internal/pipeline"
)

type pipelineStats struct {
	Total     int `json:"total"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
	Skipped   int `json:"skipped"`
}

type processAllResponse struct {
	Stats   pipelineStats          `json:"stats"`
	Results []pipeline.StageResult `json:"results"`
}

func handleProcessAll(deps *Dependencies) http.HandlerFunc {
	log := logger.New("api:pipeline")
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		pipelineDeps := &pipeline.Dependencies{
			DB:      deps.Store,
			Pool:    deps.Browser,
			Storage: deps.ObjStore,
			LLM:     deps.LLM,
		}
		if deps.Config != nil {
			pipelineDeps.Config = *deps.Config
		}

		results, err := pipeline.ProcessAll(ctx, pipelineDeps)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		succeeded := 0
		failed := 0
		skipped := 0
		for _, r := range results {
			switch r.Status {
			case "success":
				succeeded++
			case "failed", "error":
				failed++
			case "skipped":
				skipped++
			}
		}

		log.Info("process-all pipeline complete", "succeeded", succeeded, "failed", failed)

		writeSuccess(w, processAllResponse{
			Stats: pipelineStats{
				Total:     len(results),
				Succeeded: succeeded,
				Failed:    failed,
				Skipped:   skipped,
			},
			Results: results,
		})
	}
}
