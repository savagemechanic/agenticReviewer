package api

import (
	"net/http"
	"time"
)

type healthResponse struct {
	Status  string `json:"status"`
	DB      string `json:"db"`
	Storage string `json:"storage"`
	Uptime  int64  `json:"uptime"`
}

func handleHealth(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "ok"
		storageStatus := "ok"

		// Verify DB by running a simple count.
		if _, err := deps.Store.CountProducts(r.Context()); err != nil {
			dbStatus = "error"
		}

		// Verify storage by checking it's non-nil.
		if deps.ObjStore == nil {
			storageStatus = "not configured"
		}

		uptime := int64(time.Since(deps.StartTime).Seconds())

		status := "ok"
		if dbStatus != "ok" {
			status = "degraded"
		}

		writeJSON(w, http.StatusOK, healthResponse{
			Status:  status,
			DB:      dbStatus,
			Storage: storageStatus,
			Uptime:  uptime,
		})
	}
}
