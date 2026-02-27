package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func serveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "HTTP REST API gateway (dials remote gRPC workers)",
		Long: `Starts only the HTTP REST API server. Pipeline stages are executed
via gRPC calls to remote worker processes. Use --grpc-target to specify
the worker address.

For local development, prefer "worker" mode which runs everything in-process.`,
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("serve")
			log.Info("serve mode — connecting to gRPC workers", "target", flagGRPCTarget)
			return fmt.Errorf("serve mode not yet implemented — use 'worker' for now")
		},
	}
}
