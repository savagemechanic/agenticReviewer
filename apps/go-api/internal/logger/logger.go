package logger

import (
	"log/slog"
	"os"
)

var root *slog.Logger

func init() {
	root = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

func New(component string) *slog.Logger {
	return root.With("component", component)
}
