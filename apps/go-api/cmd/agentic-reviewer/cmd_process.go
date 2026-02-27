package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func processCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "process",
		Short: "gRPC ProcessService server (needs Chromium)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("process")
			log.Info("starting ProcessService gRPC server", "port", flagGRPCPort)
			return fmt.Errorf("individual gRPC services not yet implemented — use 'worker' for now")
		},
	}
}
