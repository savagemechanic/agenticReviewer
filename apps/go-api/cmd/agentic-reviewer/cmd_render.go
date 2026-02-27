package main

import (
	"fmt"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func renderCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "render",
		Short: "gRPC RenderService server (calls Remotion via HTTP)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			log := logger.New("render")
			log.Info("starting RenderService gRPC server", "port", flagGRPCPort)
			return fmt.Errorf("individual gRPC services not yet implemented — use 'worker' for now")
		},
	}
}
