package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func summarizeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "summarize",
		Short: "gRPC SummarizeService server (needs Anthropic API key)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("summarize")
			log.Info("starting SummarizeService gRPC server", "port", flagGRPCPort)
			return fmt.Errorf("individual gRPC services not yet implemented — use 'worker' for now")
		},
	}
}
