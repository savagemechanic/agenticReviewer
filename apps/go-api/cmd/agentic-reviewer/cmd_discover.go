package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func discoverCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "discover",
		Short: "gRPC DiscoveryService server",
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("discover")
			log.Info("starting DiscoveryService gRPC server", "port", flagGRPCPort)
			return fmt.Errorf("individual gRPC services not yet implemented — use 'worker' for now")
		},
	}
}
