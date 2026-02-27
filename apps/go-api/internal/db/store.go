package db

import (
	"context"

	"github.com/google/uuid"
)

// Store is the repository interface for all database operations.
// Implementations: SQLiteStore (embedded), PostgresStore (production).
//
// Both implementations use the same SQL dialect subset:
//   - Positional placeholders ($1, $2, …) for Postgres; (?, ?, …) for SQLite
//   - RETURNING clause (supported since SQLite 3.35+)
//   - Standard aggregate functions (count, GROUP BY)
type Store interface {
	// Products
	ListProducts(ctx context.Context, limit, offset int32) ([]Product, error)
	ListProductsByStatus(ctx context.Context, status string, limit, offset int32) ([]Product, error)
	ListProductsBySource(ctx context.Context, source string, limit, offset int32) ([]Product, error)
	ListProductsByStatusAndSource(ctx context.Context, status, source string, limit, offset int32) ([]Product, error)
	ListProductsByStatuses(ctx context.Context, statuses []string, limit, offset int32) ([]Product, error)
	CountProducts(ctx context.Context) (int64, error)
	CountProductsByStatus(ctx context.Context, status string) (int64, error)
	CountProductsBySource(ctx context.Context, source string) (int64, error)
	CountProductsByStatusAndSource(ctx context.Context, status, source string) (int64, error)
	ProductStatusCounts(ctx context.Context) ([]StatusCount, error)
	GetProduct(ctx context.Context, id uuid.UUID) (Product, error)
	GetProductByURL(ctx context.Context, url string) (Product, error)
	InsertProduct(ctx context.Context, p Product) (Product, error)
	UpdateProductStatus(ctx context.Context, id uuid.UUID, status string) error

	// Screenshots
	ListScreenshotsByProduct(ctx context.Context, productID uuid.UUID) ([]Screenshot, error)
	InsertScreenshot(ctx context.Context, s Screenshot) (Screenshot, error)

	// Page Extractions
	GetExtractionByProduct(ctx context.Context, productID uuid.UUID) (PageExtraction, error)
	InsertExtraction(ctx context.Context, e PageExtraction) (PageExtraction, error)

	// Summaries
	GetSummaryByProduct(ctx context.Context, productID uuid.UUID) (Summary, error)
	InsertSummary(ctx context.Context, s Summary) (Summary, error)
	DeleteSummaryByProduct(ctx context.Context, productID uuid.UUID) error

	// Scores
	GetScoreByProduct(ctx context.Context, productID uuid.UUID) (Score, error)
	InsertScore(ctx context.Context, s Score) (Score, error)
	DeleteScoreByProduct(ctx context.Context, productID uuid.UUID) error

	// Videos
	ListVideos(ctx context.Context, limit, offset int32) ([]VideoWithProduct, error)
	ListVideosByStatus(ctx context.Context, status string, limit, offset int32) ([]VideoWithProduct, error)
	GetVideo(ctx context.Context, id uuid.UUID) (Video, error)
	GetVideoByProduct(ctx context.Context, productID uuid.UUID) (Video, error)
	InsertVideo(ctx context.Context, v Video) (Video, error)
	UpdateVideoStatus(ctx context.Context, id uuid.UUID, status string) error
	UpdateVideoRendered(ctx context.Context, id uuid.UUID, storageKey string, durationSec int32, format string) error
	UpdateVideoMetadata(ctx context.Context, id uuid.UUID, metadata []byte) error
	VideoStatusCounts(ctx context.Context) ([]StatusCount, error)

	// Publications
	InsertPublication(ctx context.Context, p Publication) (Publication, error)
	UpdatePublicationStatus(ctx context.Context, id uuid.UUID, status string, errMsg *string) error
	UpdatePublicationPublished(ctx context.Context, id uuid.UUID, externalID, externalURL string) error

	// Discovery Runs
	ListDiscoveryRuns(ctx context.Context, limit, offset int32) ([]DiscoveryRun, error)
	InsertDiscoveryRun(ctx context.Context, d DiscoveryRun) (DiscoveryRun, error)
	UpdateDiscoveryRunCompleted(ctx context.Context, id uuid.UUID, productsFound, productsNew int32) error
	UpdateDiscoveryRunFailed(ctx context.Context, id uuid.UUID, errMsg string) error

	// Lifecycle
	Close() error
}
