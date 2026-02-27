package grpc

import (
	"log/slog"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/agenticreviewer/go-api/internal/config"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/llm"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/agenticreviewer/go-api/internal/storage"
)

var log *slog.Logger = logger.New("grpc")

// ServiceDeps holds all dependencies needed by gRPC service implementations.
type ServiceDeps struct {
	Store    db.Store
	ObjStore storage.ObjectStore
	Browser  *browser.Pool
	LLM      *llm.Client
	Config   *config.Config
}
