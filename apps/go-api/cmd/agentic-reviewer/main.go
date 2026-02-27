package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	// Global flags — backend selection with zero-dependency defaults.
	flagDBBackend        string
	flagDBPath           string
	flagStorageBackend   string
	flagStorageDir       string
	flagRatelimitBackend string
	flagHTTPPort         int
	flagGRPCPort         int
	flagGRPCTarget       string
)

func main() {
	root := &cobra.Command{
		Use:   "agentic-reviewer",
		Short: "Autonomous B2B product review platform",
		Long: `Agentic Reviewer discovers SaaS products, processes them via browser
automation, generates AI-powered video reviews, and publishes to
YouTube/TikTok/Instagram with human-in-the-loop approval.

Run "agentic-reviewer worker" to start everything in a single process.`,
	}

	// Global persistent flags — available to all subcommands.
	pf := root.PersistentFlags()
	pf.StringVar(&flagDBBackend, "db-backend", "sqlite", "Database backend: sqlite or postgres")
	pf.StringVar(&flagDBPath, "db-path", "./data/agentic.db", "SQLite database file path")
	pf.StringVar(&flagStorageBackend, "storage-backend", "filesystem", "Storage backend: filesystem or minio")
	pf.StringVar(&flagStorageDir, "storage-dir", "./data/storage", "Filesystem storage directory")
	pf.StringVar(&flagRatelimitBackend, "ratelimit-backend", "memory", "Rate limiter backend: memory or redis")
	pf.IntVar(&flagHTTPPort, "http-port", 3001, "HTTP server port")
	pf.IntVar(&flagGRPCPort, "grpc-port", 50051, "gRPC server port")
	pf.StringVar(&flagGRPCTarget, "grpc-target", "localhost:50051", "gRPC target for serve mode to dial workers")

	// Register subcommands.
	root.AddCommand(workerCmd())
	root.AddCommand(migrateCmd())
	root.AddCommand(serveCmd())
	root.AddCommand(discoverCmd())
	root.AddCommand(processCmd())
	root.AddCommand(summarizeCmd())
	root.AddCommand(scoreCmd())
	root.AddCommand(renderCmd())
	root.AddCommand(distributeCmd())

	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
