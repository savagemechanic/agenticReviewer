package config

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

// Config holds all application configuration, loaded from environment variables
// and overridable via CLI flags (see cmd/agentic-reviewer).
type Config struct {
	// Backend selection — defaults are zero-dependency (sqlite, filesystem, memory).
	DBBackend        string `envconfig:"DB_BACKEND" default:"sqlite"`
	DBPath           string `envconfig:"DB_PATH" default:"./data/agentic.db"`
	StorageBackend   string `envconfig:"STORAGE_BACKEND" default:"filesystem"`
	StorageDir       string `envconfig:"STORAGE_DIR" default:"./data/storage"`
	RatelimitBackend string `envconfig:"RATELIMIT_BACKEND" default:"memory"`

	// Network
	HTTPPort   int    `envconfig:"HTTP_PORT" default:"3001"`
	GRPCPort   int    `envconfig:"GRPC_PORT" default:"50051"`
	GRPCTarget string `envconfig:"GRPC_TARGET" default:"localhost:50051"`

	// Postgres (only when DB_BACKEND=postgres)
	DatabaseURL string `envconfig:"DATABASE_URL"`

	// Redis (only when RATELIMIT_BACKEND=redis)
	RedisURL string `envconfig:"REDIS_URL"`

	// MinIO (only when STORAGE_BACKEND=minio)
	MinioEndpoint  string `envconfig:"MINIO_ENDPOINT"`
	MinioPort      int    `envconfig:"MINIO_PORT" default:"9000"`
	MinioAccessKey string `envconfig:"MINIO_ACCESS_KEY"`
	MinioSecretKey string `envconfig:"MINIO_SECRET_KEY"`
	MinioBucket    string `envconfig:"MINIO_BUCKET" default:"agentic-reviewer"`

	// External services
	VideoRendererURL string `envconfig:"VIDEO_RENDERER_URL" default:"http://localhost:3002"`
	AnthropicAPIKey  string `envconfig:"ANTHROPIC_API_KEY"`

	// YouTube OAuth2
	YouTubeClientID     string `envconfig:"YOUTUBE_CLIENT_ID"`
	YouTubeClientSecret string `envconfig:"YOUTUBE_CLIENT_SECRET"`
	YouTubeRefreshToken string `envconfig:"YOUTUBE_REFRESH_TOKEN"`

	// Optional
	ChromiumPath        string `envconfig:"CHROMIUM_PATH"`
	ProductHuntAPIToken string `envconfig:"PRODUCTHUNT_API_TOKEN"`
	CORSOrigin          string `envconfig:"CORS_ORIGIN" default:"*"`

	// Legacy alias — maps to HTTPPort for backwards compatibility.
	Port int `envconfig:"PORT" default:"3001"`
}

// Load reads configuration from environment variables.
func Load() (Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return Config{}, fmt.Errorf("loading config: %w", err)
	}
	// Sync legacy Port with HTTPPort if only PORT is set.
	if cfg.HTTPPort == 3001 && cfg.Port != 3001 {
		cfg.HTTPPort = cfg.Port
	}
	return cfg, nil
}
