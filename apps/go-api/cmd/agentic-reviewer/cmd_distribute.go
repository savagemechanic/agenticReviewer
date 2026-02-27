package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func distributeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "distribute",
		Short: "gRPC DistributeService server",
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("distribute")
			log.Info("starting DistributeService gRPC server", "port", flagGRPCPort)
			return fmt.Errorf("individual gRPC services not yet implemented — use 'worker' for now")
		},
	}
}
