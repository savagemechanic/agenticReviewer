package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresStore wraps the existing Queries/pgxpool to satisfy the Store interface.
type PostgresStore struct {
	pool    *pgxpool.Pool
	queries *Queries
}

// NewPostgresStore creates a PostgresStore from an existing connection pool.
func NewPostgresStore(ctx context.Context, databaseURL string) (*PostgresStore, error) {
	pool, err := NewPool(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	return &PostgresStore{
		pool:    pool,
		queries: NewQueries(pool),
	}, nil
}

// Pool returns the underlying pgxpool.Pool for direct queries (e.g. handler_products raw SQL).
func (s *PostgresStore) Pool() *pgxpool.Pool {
	return s.pool
}

func (s *PostgresStore) Close() error {
	s.pool.Close()
	return nil
}

// Delegate all Store methods to the existing Queries implementation.

func (s *PostgresStore) ListProducts(ctx context.Context, limit, offset int32) ([]Product, error) {
	return s.queries.ListProducts(ctx, limit, offset)
}
func (s *PostgresStore) ListProductsByStatus(ctx context.Context, status string, limit, offset int32) ([]Product, error) {
	return s.queries.ListProductsByStatus(ctx, status, limit, offset)
}
func (s *PostgresStore) ListProductsBySource(ctx context.Context, source string, limit, offset int32) ([]Product, error) {
	return s.queries.ListProductsBySource(ctx, source, limit, offset)
}
func (s *PostgresStore) ListProductsByStatusAndSource(ctx context.Context, status, source string, limit, offset int32) ([]Product, error) {
	return s.queries.ListProductsByStatusAndSource(ctx, status, source, limit, offset)
}
func (s *PostgresStore) ListProductsByStatuses(ctx context.Context, statuses []string, limit, offset int32) ([]Product, error) {
	return s.queries.ListProductsByStatuses(ctx, statuses, limit, offset)
}
func (s *PostgresStore) CountProducts(ctx context.Context) (int64, error) {
	return s.queries.CountProducts(ctx)
}
func (s *PostgresStore) CountProductsByStatus(ctx context.Context, status string) (int64, error) {
	return s.queries.CountProductsByStatus(ctx, status)
}
func (s *PostgresStore) CountProductsBySource(ctx context.Context, source string) (int64, error) {
	return s.queries.CountProductsBySource(ctx, source)
}
func (s *PostgresStore) CountProductsByStatusAndSource(ctx context.Context, status, source string) (int64, error) {
	return s.queries.CountProductsByStatusAndSource(ctx, status, source)
}
func (s *PostgresStore) ProductStatusCounts(ctx context.Context) ([]StatusCount, error) {
	return s.queries.ProductStatusCounts(ctx)
}
func (s *PostgresStore) GetProduct(ctx context.Context, id uuid.UUID) (Product, error) {
	return s.queries.GetProduct(ctx, id)
}
func (s *PostgresStore) GetProductByURL(ctx context.Context, url string) (Product, error) {
	return s.queries.GetProductByURL(ctx, url)
}
func (s *PostgresStore) InsertProduct(ctx context.Context, p Product) (Product, error) {
	return s.queries.InsertProduct(ctx, p)
}
func (s *PostgresStore) UpdateProductStatus(ctx context.Context, id uuid.UUID, status string) error {
	return s.queries.UpdateProductStatus(ctx, id, status)
}
func (s *PostgresStore) ListScreenshotsByProduct(ctx context.Context, productID uuid.UUID) ([]Screenshot, error) {
	return s.queries.ListScreenshotsByProduct(ctx, productID)
}
func (s *PostgresStore) InsertScreenshot(ctx context.Context, sc Screenshot) (Screenshot, error) {
	return s.queries.InsertScreenshot(ctx, sc)
}
func (s *PostgresStore) GetExtractionByProduct(ctx context.Context, productID uuid.UUID) (PageExtraction, error) {
	return s.queries.GetExtractionByProduct(ctx, productID)
}
func (s *PostgresStore) InsertExtraction(ctx context.Context, e PageExtraction) (PageExtraction, error) {
	return s.queries.InsertExtraction(ctx, e)
}
func (s *PostgresStore) GetSummaryByProduct(ctx context.Context, productID uuid.UUID) (Summary, error) {
	return s.queries.GetSummaryByProduct(ctx, productID)
}
func (s *PostgresStore) InsertSummary(ctx context.Context, sm Summary) (Summary, error) {
	return s.queries.InsertSummary(ctx, sm)
}
func (s *PostgresStore) DeleteSummaryByProduct(ctx context.Context, productID uuid.UUID) error {
	return s.queries.DeleteSummaryByProduct(ctx, productID)
}
func (s *PostgresStore) GetScoreByProduct(ctx context.Context, productID uuid.UUID) (Score, error) {
	return s.queries.GetScoreByProduct(ctx, productID)
}
func (s *PostgresStore) InsertScore(ctx context.Context, sc Score) (Score, error) {
	return s.queries.InsertScore(ctx, sc)
}
func (s *PostgresStore) DeleteScoreByProduct(ctx context.Context, productID uuid.UUID) error {
	return s.queries.DeleteScoreByProduct(ctx, productID)
}
func (s *PostgresStore) ListVideos(ctx context.Context, limit, offset int32) ([]VideoWithProduct, error) {
	return s.queries.ListVideos(ctx, limit, offset)
}
func (s *PostgresStore) ListVideosByStatus(ctx context.Context, status string, limit, offset int32) ([]VideoWithProduct, error) {
	return s.queries.ListVideosByStatus(ctx, status, limit, offset)
}
func (s *PostgresStore) GetVideo(ctx context.Context, id uuid.UUID) (Video, error) {
	return s.queries.GetVideo(ctx, id)
}
func (s *PostgresStore) GetVideoByProduct(ctx context.Context, productID uuid.UUID) (Video, error) {
	return s.queries.GetVideoByProduct(ctx, productID)
}
func (s *PostgresStore) InsertVideo(ctx context.Context, v Video) (Video, error) {
	return s.queries.InsertVideo(ctx, v)
}
func (s *PostgresStore) UpdateVideoStatus(ctx context.Context, id uuid.UUID, status string) error {
	return s.queries.UpdateVideoStatus(ctx, id, status)
}
func (s *PostgresStore) UpdateVideoRendered(ctx context.Context, id uuid.UUID, storageKey string, durationSec int32, format string) error {
	return s.queries.UpdateVideoRendered(ctx, id, storageKey, durationSec, format)
}
func (s *PostgresStore) UpdateVideoMetadata(ctx context.Context, id uuid.UUID, metadata []byte) error {
	return s.queries.UpdateVideoMetadata(ctx, id, metadata)
}
func (s *PostgresStore) VideoStatusCounts(ctx context.Context) ([]StatusCount, error) {
	return s.queries.VideoStatusCounts(ctx)
}
func (s *PostgresStore) InsertPublication(ctx context.Context, p Publication) (Publication, error) {
	return s.queries.InsertPublication(ctx, p)
}
func (s *PostgresStore) UpdatePublicationStatus(ctx context.Context, id uuid.UUID, status string, errMsg *string) error {
	return s.queries.UpdatePublicationStatus(ctx, id, status, errMsg)
}
func (s *PostgresStore) UpdatePublicationPublished(ctx context.Context, id uuid.UUID, externalID, externalURL string) error {
	return s.queries.UpdatePublicationPublished(ctx, id, externalID, externalURL)
}
func (s *PostgresStore) ListDiscoveryRuns(ctx context.Context, limit, offset int32) ([]DiscoveryRun, error) {
	return s.queries.ListDiscoveryRuns(ctx, limit, offset)
}
func (s *PostgresStore) InsertDiscoveryRun(ctx context.Context, d DiscoveryRun) (DiscoveryRun, error) {
	return s.queries.InsertDiscoveryRun(ctx, d)
}
func (s *PostgresStore) UpdateDiscoveryRunCompleted(ctx context.Context, id uuid.UUID, productsFound, productsNew int32) error {
	return s.queries.UpdateDiscoveryRunCompleted(ctx, id, productsFound, productsNew)
}
func (s *PostgresStore) UpdateDiscoveryRunFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	return s.queries.UpdateDiscoveryRunFailed(ctx, id, errMsg)
}

// Ping checks the database connection health.
func (s *PostgresStore) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

// ExecRaw provides raw SQL execution for handlers that build dynamic queries.
func (s *PostgresStore) ExecRaw(ctx context.Context, sql string, args ...interface{}) error {
	_, err := s.pool.Exec(ctx, sql, args...)
	return err
}

// QueryRowRaw provides raw single-row queries for handlers that build dynamic queries.
func (s *PostgresStore) QueryRowRaw(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return s.pool.QueryRow(ctx, sql, args...)
}

// QueryRaw provides raw multi-row queries for handlers that build dynamic queries.
func (s *PostgresStore) QueryRaw(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return s.pool.Query(ctx, sql, args...)
}

// Compile-time interface satisfaction checks.
var _ Store = (*PostgresStore)(nil)
var _ Store = (*SQLiteStore)(nil)
