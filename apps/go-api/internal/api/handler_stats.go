package api

import (
	"net/http"

	"github.com/agenticreviewer/go-api/internal/db"
)

type statsResponse struct {
	TotalProducts       int              `json:"totalProducts"`
	ProductsByStatus    map[string]int64 `json:"productsByStatus"`
	VideosByStatus      map[string]int64 `json:"videosByStatus"`
	RecentDiscoveryRuns []db.DiscoveryRun `json:"recentDiscoveryRuns"`
}

func handleStats(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Products by status
		productCounts, err := deps.Store.ProductStatusCounts(ctx)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		productsByStatus := make(map[string]int64)
		var totalProducts int
		for _, sc := range productCounts {
			productsByStatus[sc.Status] = sc.Count
			totalProducts += int(sc.Count)
		}

		// Videos by status
		videoCounts, err := deps.Store.VideoStatusCounts(ctx)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		videosByStatus := make(map[string]int64)
		for _, sc := range videoCounts {
			videosByStatus[sc.Status] = sc.Count
		}

		// Recent discovery runs
		runs, err := deps.Store.ListDiscoveryRuns(ctx, 5, 0)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if runs == nil {
			runs = []db.DiscoveryRun{}
		}

		writeSuccess(w, statsResponse{
			TotalProducts:       totalProducts,
			ProductsByStatus:    productsByStatus,
			VideosByStatus:      videosByStatus,
			RecentDiscoveryRuns: runs,
		})
	}
}
