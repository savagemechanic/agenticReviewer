package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func scoreCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "score",
		Short: "gRPC ScoreService server (needs Anthropic API key)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("score")
			log.Info("starting ScoreService gRPC server", "port", flagGRPCPort)
			return fmt.Errorf("individual gRPC services not yet implemented — use 'worker' for now")
		},
	}
}
