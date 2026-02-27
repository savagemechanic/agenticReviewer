package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/agenticreviewer/go-api/internal/config"
	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/spf13/cobra"
)

func migrateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "migrate",
		Short: "Run database migrations",
		Long:  `Creates or updates the database schema. For SQLite, creates the file if it doesn't exist.`,
		RunE:  runMigrate,
	}
}

func runMigrate(cmd *cobra.Command, _ []string) error {
	log := logger.New("migrate")

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	applyFlagOverrides(&cfg)

	switch cfg.DBBackend {
	case "sqlite":
		// Ensure directory exists.
		dir := filepath.Dir(cfg.DBPath)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("create db directory: %w", err)
		}

		store, err := db.NewSQLiteStore(cfg.DBPath)
		if err != nil {
			return fmt.Errorf("open sqlite: %w", err)
		}
		defer store.Close()

		// Read and execute the migration SQL.
		migrationSQL, err := os.ReadFile("internal/db/migrations/001_init.sql")
		if err != nil {
			// Try relative to executable.
			execDir, _ := os.Executable()
			migrationSQL, err = os.ReadFile(filepath.Join(filepath.Dir(execDir), "internal/db/migrations/001_init.sql"))
			if err != nil {
				return fmt.Errorf("read migration file: %w", err)
			}
		}

		if _, err := store.DB().Exec(string(migrationSQL)); err != nil {
			return fmt.Errorf("execute migration: %w", err)
		}

		log.Info("migration complete", "path", cfg.DBPath)

	case "postgres":
		log.Info("postgres migrations use the existing golang-migrate setup")
		log.Info("run: migrate -path internal/db/migrations -database $DATABASE_URL up")

	default:
		return fmt.Errorf("unknown db-backend: %q", cfg.DBBackend)
	}

	return nil
}
