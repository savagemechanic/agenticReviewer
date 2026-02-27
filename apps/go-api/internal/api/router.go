package api

import (
	"time"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/config"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/agenticreviewer/go-api/internal/storage"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

// Dependencies holds all shared dependencies injected into handlers.
// Uses interfaces for db and storage to support embedded (SQLite, filesystem)
// and external (Postgres, MinIO) backends.
type Dependencies struct {
	Store     db.Store
	ObjStore  storage.ObjectStore
	Browser   *browser.Pool
	LLM       *llm.Client
	Config    *config.Config
	StartTime time.Time
}

// NewRouter creates a chi.Router with all middleware and routes registered.
func NewRouter(deps *Dependencies) chi.Router {
	r := chi.NewRouter()

	// Global middleware
	r.Use(SecurityHeaders)
	r.Use(RequestID)
	r.Use(RequestLogger)

	// CORS
	origin := deps.Config.CORSOrigin
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{origin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: origin != "*",
		MaxAge:           300,
	}))

	// Health
	r.Get("/health", handleHealth(deps))

	// Products
	r.Route("/products", func(r chi.Router) {
		r.Get("/", handleListProducts(deps))
		r.Get("/{id}", handleGetProduct(deps))
	})

	// Stats
	r.Get("/stats", handleStats(deps))

	// Videos
	r.Route("/videos", func(r chi.Router) {
		r.Get("/", handleListVideos(deps))
		r.Post("/{id}/approve", handleApproveVideo(deps))
		r.Post("/{id}/reject", handleRejectVideo(deps))
	})

	// Discovery
	r.Route("/discover", func(r chi.Router) {
		r.Get("/", handleListDiscoveryRuns(deps))
		r.Post("/", handleDiscover(deps))
	})

	// Processing stages
	r.Post("/process", handleProcess(deps))
	r.Post("/summarize", handleSummarize(deps))
	r.Post("/score", handleScore(deps))

	// Video render
	r.Post("/video/render", handleVideoRender(deps))

	// Distribution
	r.Post("/distribute", handleDistribute(deps))

	// Pipeline
	r.Post("/pipeline/process-all", handleProcessAll(deps))

	return r
}
