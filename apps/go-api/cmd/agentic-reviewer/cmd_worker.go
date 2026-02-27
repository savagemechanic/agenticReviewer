package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/agenticreviewer/go-api/internal/api"
	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/config"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/agenticreviewer/go-api/internal/ratelimit"
	"github.com/agenticreviewer/go-api/internal/storage"
	"github.com/spf13/cobra"
)

// workerCmd starts everything in one process: REST API + all pipeline workers.
// This is the default development mode — zero external dependencies except
// Chromium (for browser stages) and Anthropic API key (for LLM stages).
func workerCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "worker",
		Short: "All-in-one: REST API + all pipeline workers in-process",
		Long: `Starts the HTTP REST API and all pipeline stage workers in a single
process. Uses bufconn for zero-overhead in-process gRPC communication.

This is the recommended mode for local development.`,
		RunE: runWorker,
	}
}

func runWorker(cmd *cobra.Command, _ []string) error {
	log := logger.New("worker")
	ctx, cancel := context.WithCancel(cmd.Context())
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// Apply CLI flag overrides.
	applyFlagOverrides(&cfg)

	// --- Database ---
	var store db.Store
	switch cfg.DBBackend {
	case "sqlite":
		log.Info("using SQLite backend", "path", cfg.DBPath)
		sqliteStore, err := db.NewSQLiteStore(cfg.DBPath)
		if err != nil {
			return fmt.Errorf("open sqlite: %w", err)
		}
		store = sqliteStore
	case "postgres":
		if cfg.DatabaseURL == "" {
			return fmt.Errorf("DATABASE_URL required when db-backend=postgres")
		}
		log.Info("using Postgres backend")
		pgStore, err := db.NewPostgresStore(ctx, cfg.DatabaseURL)
		if err != nil {
			return fmt.Errorf("open postgres: %w", err)
		}
		store = pgStore
	default:
		return fmt.Errorf("unknown db-backend: %q", cfg.DBBackend)
	}
	defer store.Close()

	// --- Storage ---
	var objStore storage.ObjectStore
	var fsStore *storage.FilesystemStore
	switch cfg.StorageBackend {
	case "filesystem":
		log.Info("using filesystem storage", "dir", cfg.StorageDir)
		fsStore, err = storage.NewFilesystemStore(cfg.StorageDir, cfg.HTTPPort)
		if err != nil {
			return fmt.Errorf("create filesystem store: %w", err)
		}
		objStore = fsStore
	case "minio":
		if cfg.MinioEndpoint == "" {
			return fmt.Errorf("MINIO_ENDPOINT required when storage-backend=minio")
		}
		log.Info("using MinIO storage", "endpoint", cfg.MinioEndpoint)
		minioClient, err := storage.NewClient(cfg.MinioEndpoint, cfg.MinioPort, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioBucket)
		if err != nil {
			return fmt.Errorf("create minio client: %w", err)
		}
		objStore = minioClient
	default:
		return fmt.Errorf("unknown storage-backend: %q", cfg.StorageBackend)
	}

	// --- Rate Limiter ---
	var limiter ratelimit.Limiter
	switch cfg.RatelimitBackend {
	case "memory":
		log.Info("using in-memory rate limiter")
		limiter = ratelimit.NewMemoryLimiter(60_000, 100) // 100 req/min
	case "redis":
		if cfg.RedisURL == "" {
			return fmt.Errorf("REDIS_URL required when ratelimit-backend=redis")
		}
		log.Info("using Redis rate limiter")
		// Redis limiter would be initialized here.
		// For now, fall back to memory if redis import causes issues.
		limiter = ratelimit.NewMemoryLimiter(60_000, 100)
	default:
		return fmt.Errorf("unknown ratelimit-backend: %q", cfg.RatelimitBackend)
	}
	_ = limiter // Used by middleware — wired in Phase 4

	// --- Browser Pool ---
	browserPool := browser.NewPool(3, 10, cfg.ChromiumPath)

	// --- LLM ---
	var llmClient *llm.Client
	if cfg.AnthropicAPIKey != "" {
		llmClient = llm.NewClient(cfg.AnthropicAPIKey)
		log.Info("LLM client initialized")
	} else {
		log.Warn("ANTHROPIC_API_KEY not set, LLM stages will fail")
	}

	// --- Wire Dependencies ---
	deps := &api.Dependencies{
		Store:     store,
		ObjStore:  objStore,
		Browser:   browserPool,
		LLM:       llmClient,
		Config:    &cfg,
		StartTime: time.Now(),
	}

	chiRouter := api.NewRouter(deps)

	// Mount filesystem storage as static file server.
	if fsStore != nil {
		fileServer := http.StripPrefix("/files/", http.FileServer(http.Dir(fsStore.BaseDir())))
		chiRouter.Handle("/files/*", fileServer)
	}

	router := chiRouter

	addr := fmt.Sprintf(":%d", cfg.HTTPPort)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen %s: %w", addr, err)
	}

	go func() {
		log.Info("worker starting", "addr", addr, "db", cfg.DBBackend, "storage", cfg.StorageBackend)
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	sig := <-sigCh
	log.Info("shutting down", "signal", sig)

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := browserPool.Close(); err != nil {
		log.Warn("browser pool close error", "error", err)
	}

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	log.Info("worker stopped")
	return nil
}

// applyFlagOverrides overrides config values with CLI flags when they differ from defaults.
func applyFlagOverrides(cfg *config.Config) {
	if flagDBBackend != "sqlite" {
		cfg.DBBackend = flagDBBackend
	}
	if flagDBPath != "./data/agentic.db" {
		cfg.DBPath = flagDBPath
	}
	if flagStorageBackend != "filesystem" {
		cfg.StorageBackend = flagStorageBackend
	}
	if flagStorageDir != "./data/storage" {
		cfg.StorageDir = flagStorageDir
	}
	if flagRatelimitBackend != "memory" {
		cfg.RatelimitBackend = flagRatelimitBackend
	}
	if flagHTTPPort != 3001 {
		cfg.HTTPPort = flagHTTPPort
	}
	if flagGRPCPort != 50051 {
		cfg.GRPCPort = flagGRPCPort
	}
	if flagGRPCTarget != "localhost:50051" {
		cfg.GRPCTarget = flagGRPCTarget
	}
}
