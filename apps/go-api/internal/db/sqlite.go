package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// SQLiteStore implements Store using modernc.org/sqlite (pure Go, no CGO).
// Uses WAL mode for concurrent reads and ? placeholders.
type SQLiteStore struct {
	db *sql.DB
}

// NewSQLiteStore opens (or creates) a SQLite database at path with WAL mode enabled.
func NewSQLiteStore(path string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(wal)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(on)")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1) // SQLite single-writer
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return &SQLiteStore{db: db}, nil
}

// DB returns the underlying *sql.DB for migrations.
func (s *SQLiteStore) DB() *sql.DB {
	return s.db
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

func (s *SQLiteStore) ListProducts(ctx context.Context, limit, offset int32) ([]Product, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products ORDER BY discovered_at DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

func (s *SQLiteStore) ListProductsByStatus(ctx context.Context, status string, limit, offset int32) ([]Product, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE status = ? ORDER BY discovered_at DESC LIMIT ? OFFSET ?`, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by status: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

func (s *SQLiteStore) ListProductsBySource(ctx context.Context, source string, limit, offset int32) ([]Product, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE source = ? ORDER BY discovered_at DESC LIMIT ? OFFSET ?`, source, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by source: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

func (s *SQLiteStore) ListProductsByStatusAndSource(ctx context.Context, status, source string, limit, offset int32) ([]Product, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE status = ? AND source = ? ORDER BY discovered_at DESC LIMIT ? OFFSET ?`,
		status, source, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by status and source: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

func (s *SQLiteStore) ListProductsByStatuses(ctx context.Context, statuses []string, limit, offset int32) ([]Product, error) {
	if len(statuses) == 0 {
		return []Product{}, nil
	}
	placeholders := make([]string, len(statuses))
	args := make([]interface{}, 0, len(statuses)+2)
	for i, st := range statuses {
		placeholders[i] = "?"
		args = append(args, st)
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE status IN (%s) ORDER BY discovered_at DESC LIMIT ? OFFSET ?`,
		strings.Join(placeholders, ","))
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list products by statuses: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

func (s *SQLiteStore) CountProducts(ctx context.Context) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM products`).Scan(&count)
	return count, err
}

func (s *SQLiteStore) CountProductsByStatus(ctx context.Context, status string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM products WHERE status = ?`, status).Scan(&count)
	return count, err
}

func (s *SQLiteStore) CountProductsBySource(ctx context.Context, source string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM products WHERE source = ?`, source).Scan(&count)
	return count, err
}

func (s *SQLiteStore) CountProductsByStatusAndSource(ctx context.Context, status, source string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM products WHERE status = ? AND source = ?`, status, source).Scan(&count)
	return count, err
}

func (s *SQLiteStore) ProductStatusCounts(ctx context.Context) ([]StatusCount, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT status, count(*) AS count FROM products GROUP BY status ORDER BY status`)
	if err != nil {
		return nil, fmt.Errorf("product status counts: %w", err)
	}
	defer rows.Close()
	var out []StatusCount
	for rows.Next() {
		var sc StatusCount
		if err := rows.Scan(&sc.Status, &sc.Count); err != nil {
			return nil, err
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) GetProduct(ctx context.Context, id uuid.UUID) (Product, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE id = ?`, id.String())
	return scanProduct(row)
}

func (s *SQLiteStore) GetProductByURL(ctx context.Context, url string) (Product, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE url = ?`, url)
	return scanProduct(row)
}

func (s *SQLiteStore) InsertProduct(ctx context.Context, p Product) (Product, error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now().UTC()
	if p.DiscoveredAt.IsZero() {
		p.DiscoveredAt = now
	}
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = now
	}
	if p.Status == "" {
		p.Status = "discovered"
	}
	metaBytes, _ := json.Marshal(p.Metadata)
	if p.Metadata == nil {
		metaBytes = []byte("null")
	}

	row := s.db.QueryRowContext(ctx,
		`INSERT INTO products (id, name, url, source, description, status, metadata, discovered_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		 RETURNING id, name, url, source, description, status, metadata, discovered_at, updated_at`,
		p.ID.String(), p.Name, p.URL, p.Source, p.Description, p.Status, string(metaBytes),
		p.DiscoveredAt.Format(time.RFC3339Nano), p.UpdatedAt.Format(time.RFC3339Nano))
	return scanProduct(row)
}

func (s *SQLiteStore) UpdateProductStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE products SET status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now().UTC().Format(time.RFC3339Nano), id.String())
	return err
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

func (s *SQLiteStore) ListScreenshotsByProduct(ctx context.Context, productID uuid.UUID) ([]Screenshot, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, product_id, url, page_url, type, width, height, created_at
		 FROM screenshots WHERE product_id = ? ORDER BY created_at`, productID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Screenshot
	for rows.Next() {
		var sc Screenshot
		var id, pid, createdAt string
		if err := rows.Scan(&id, &pid, &sc.URL, &sc.PageURL, &sc.Type, &sc.Width, &sc.Height, &createdAt); err != nil {
			return nil, err
		}
		sc.ID, _ = uuid.Parse(id)
		sc.ProductID, _ = uuid.Parse(pid)
		sc.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
		out = append(out, sc)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) InsertScreenshot(ctx context.Context, sc Screenshot) (Screenshot, error) {
	if sc.ID == uuid.Nil {
		sc.ID = uuid.New()
	}
	now := time.Now().UTC()
	if sc.CreatedAt.IsZero() {
		sc.CreatedAt = now
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO screenshots (id, product_id, url, page_url, type, width, height, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		sc.ID.String(), sc.ProductID.String(), sc.URL, sc.PageURL, sc.Type, sc.Width, sc.Height,
		sc.CreatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return Screenshot{}, err
	}
	return sc, nil
}

// ---------------------------------------------------------------------------
// Page Extractions
// ---------------------------------------------------------------------------

func (s *SQLiteStore) GetExtractionByProduct(ctx context.Context, productID uuid.UUID) (PageExtraction, error) {
	var e PageExtraction
	var id, pid, createdAt string
	var headingsStr *string
	err := s.db.QueryRowContext(ctx,
		`SELECT id, product_id, page_url, title, headings, body_text, load_time_ms, created_at
		 FROM page_extractions WHERE product_id = ? ORDER BY created_at DESC LIMIT 1`,
		productID.String()).Scan(&id, &pid, &e.PageURL, &e.Title, &headingsStr, &e.BodyText, &e.LoadTimeMs, &createdAt)
	if err != nil {
		return PageExtraction{}, fmt.Errorf("get extraction by product: %w", err)
	}
	e.ID, _ = uuid.Parse(id)
	e.ProductID, _ = uuid.Parse(pid)
	e.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	if headingsStr != nil {
		e.Headings = json.RawMessage(*headingsStr)
	}
	return e, nil
}

func (s *SQLiteStore) InsertExtraction(ctx context.Context, e PageExtraction) (PageExtraction, error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	now := time.Now().UTC()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
	var headingsStr *string
	if e.Headings != nil {
		s := string(e.Headings)
		headingsStr = &s
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO page_extractions (id, product_id, page_url, title, headings, body_text, load_time_ms, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID.String(), e.ProductID.String(), e.PageURL, e.Title, headingsStr, e.BodyText, e.LoadTimeMs,
		e.CreatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return PageExtraction{}, err
	}
	return e, nil
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

func (s *SQLiteStore) GetSummaryByProduct(ctx context.Context, productID uuid.UUID) (Summary, error) {
	var sm Summary
	var id, pid, createdAt string
	var kf, pros, cons *string
	err := s.db.QueryRowContext(ctx,
		`SELECT id, product_id, content, target_audience, key_features, pros, cons, model, created_at
		 FROM summaries WHERE product_id = ?`, productID.String()).Scan(
		&id, &pid, &sm.Content, &sm.TargetAudience, &kf, &pros, &cons, &sm.Model, &createdAt)
	if err != nil {
		return Summary{}, fmt.Errorf("get summary by product: %w", err)
	}
	sm.ID, _ = uuid.Parse(id)
	sm.ProductID, _ = uuid.Parse(pid)
	sm.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	if kf != nil {
		sm.KeyFeatures = json.RawMessage(*kf)
	}
	if pros != nil {
		sm.Pros = json.RawMessage(*pros)
	}
	if cons != nil {
		sm.Cons = json.RawMessage(*cons)
	}
	return sm, nil
}

func (s *SQLiteStore) InsertSummary(ctx context.Context, sm Summary) (Summary, error) {
	if sm.ID == uuid.Nil {
		sm.ID = uuid.New()
	}
	now := time.Now().UTC()
	if sm.CreatedAt.IsZero() {
		sm.CreatedAt = now
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO summaries (id, product_id, content, target_audience, key_features, pros, cons, model, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		sm.ID.String(), sm.ProductID.String(), sm.Content, sm.TargetAudience,
		jsonStr(sm.KeyFeatures), jsonStr(sm.Pros), jsonStr(sm.Cons), sm.Model,
		sm.CreatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return Summary{}, err
	}
	return sm, nil
}

func (s *SQLiteStore) DeleteSummaryByProduct(ctx context.Context, productID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM summaries WHERE product_id = ?`, productID.String())
	return err
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

func (s *SQLiteStore) GetScoreByProduct(ctx context.Context, productID uuid.UUID) (Score, error) {
	var sc Score
	var id, pid, createdAt string
	err := s.db.QueryRowContext(ctx,
		`SELECT id, product_id, overall, ux_score, performance_score, feature_score, value_score, reasoning, model, created_at
		 FROM scores WHERE product_id = ?`, productID.String()).Scan(
		&id, &pid, &sc.Overall, &sc.UxScore, &sc.PerformanceScore, &sc.FeatureScore, &sc.ValueScore,
		&sc.Reasoning, &sc.Model, &createdAt)
	if err != nil {
		return Score{}, fmt.Errorf("get score by product: %w", err)
	}
	sc.ID, _ = uuid.Parse(id)
	sc.ProductID, _ = uuid.Parse(pid)
	sc.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	return sc, nil
}

func (s *SQLiteStore) InsertScore(ctx context.Context, sc Score) (Score, error) {
	if sc.ID == uuid.Nil {
		sc.ID = uuid.New()
	}
	now := time.Now().UTC()
	if sc.CreatedAt.IsZero() {
		sc.CreatedAt = now
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO scores (id, product_id, overall, ux_score, performance_score, feature_score, value_score, reasoning, model, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		sc.ID.String(), sc.ProductID.String(), sc.Overall, sc.UxScore, sc.PerformanceScore,
		sc.FeatureScore, sc.ValueScore, sc.Reasoning, sc.Model,
		sc.CreatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return Score{}, err
	}
	return sc, nil
}

func (s *SQLiteStore) DeleteScoreByProduct(ctx context.Context, productID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM scores WHERE product_id = ?`, productID.String())
	return err
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

func (s *SQLiteStore) ListVideos(ctx context.Context, limit, offset int32) ([]VideoWithProduct, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT v.id, v.product_id, v.storage_key, v.duration_sec, v.status, v.format, v.metadata, v.created_at, v.updated_at,
		        p.name AS product_name
		 FROM videos v JOIN products p ON v.product_id = p.id
		 ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVideosWithProduct(rows)
}

func (s *SQLiteStore) ListVideosByStatus(ctx context.Context, status string, limit, offset int32) ([]VideoWithProduct, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT v.id, v.product_id, v.storage_key, v.duration_sec, v.status, v.format, v.metadata, v.created_at, v.updated_at,
		        p.name AS product_name
		 FROM videos v JOIN products p ON v.product_id = p.id
		 WHERE v.status = ?
		 ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVideosWithProduct(rows)
}

func (s *SQLiteStore) GetVideo(ctx context.Context, id uuid.UUID) (Video, error) {
	var v Video
	var vid, pid, createdAt, updatedAt string
	var sk, format *string
	var metaStr *string
	err := s.db.QueryRowContext(ctx,
		`SELECT id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at
		 FROM videos WHERE id = ?`, id.String()).Scan(
		&vid, &pid, &sk, &v.DurationSec, &v.Status, &format, &metaStr, &createdAt, &updatedAt)
	if err != nil {
		return Video{}, fmt.Errorf("get video: %w", err)
	}
	v.ID, _ = uuid.Parse(vid)
	v.ProductID, _ = uuid.Parse(pid)
	v.StorageKey = sk
	v.Format = format
	v.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	v.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	if metaStr != nil {
		v.Metadata = json.RawMessage(*metaStr)
	}
	return v, nil
}

func (s *SQLiteStore) GetVideoByProduct(ctx context.Context, productID uuid.UUID) (Video, error) {
	var v Video
	var vid, pid, createdAt, updatedAt string
	var sk, format *string
	var metaStr *string
	err := s.db.QueryRowContext(ctx,
		`SELECT id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at
		 FROM videos WHERE product_id = ? ORDER BY created_at DESC LIMIT 1`, productID.String()).Scan(
		&vid, &pid, &sk, &v.DurationSec, &v.Status, &format, &metaStr, &createdAt, &updatedAt)
	if err != nil {
		return Video{}, fmt.Errorf("get video by product: %w", err)
	}
	v.ID, _ = uuid.Parse(vid)
	v.ProductID, _ = uuid.Parse(pid)
	v.StorageKey = sk
	v.Format = format
	v.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	v.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	if metaStr != nil {
		v.Metadata = json.RawMessage(*metaStr)
	}
	return v, nil
}

func (s *SQLiteStore) InsertVideo(ctx context.Context, v Video) (Video, error) {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	now := time.Now().UTC()
	if v.CreatedAt.IsZero() {
		v.CreatedAt = now
	}
	if v.UpdatedAt.IsZero() {
		v.UpdatedAt = now
	}
	if v.Status == "" {
		v.Status = "pending"
	}
	var metaStr *string
	if v.Metadata != nil {
		s := string(v.Metadata)
		metaStr = &s
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO videos (id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		v.ID.String(), v.ProductID.String(), v.StorageKey, v.DurationSec, v.Status, v.Format, metaStr,
		v.CreatedAt.Format(time.RFC3339Nano), v.UpdatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return Video{}, err
	}
	return v, nil
}

func (s *SQLiteStore) UpdateVideoStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE videos SET status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now().UTC().Format(time.RFC3339Nano), id.String())
	return err
}

func (s *SQLiteStore) UpdateVideoRendered(ctx context.Context, id uuid.UUID, storageKey string, durationSec int32, format string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE videos SET storage_key = ?, duration_sec = ?, format = ?, status = 'rendered', updated_at = ? WHERE id = ?`,
		storageKey, durationSec, format, time.Now().UTC().Format(time.RFC3339Nano), id.String())
	return err
}

func (s *SQLiteStore) UpdateVideoMetadata(ctx context.Context, id uuid.UUID, metadata []byte) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE videos SET metadata = ?, updated_at = ? WHERE id = ?`,
		string(metadata), time.Now().UTC().Format(time.RFC3339Nano), id.String())
	return err
}

func (s *SQLiteStore) VideoStatusCounts(ctx context.Context) ([]StatusCount, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT status, count(*) AS count FROM videos GROUP BY status ORDER BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []StatusCount
	for rows.Next() {
		var sc StatusCount
		if err := rows.Scan(&sc.Status, &sc.Count); err != nil {
			return nil, err
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------------------
// Publications
// ---------------------------------------------------------------------------

func (s *SQLiteStore) InsertPublication(ctx context.Context, p Publication) (Publication, error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	if p.Status == "" {
		p.Status = "pending"
	}
	var pubAt *string
	if p.PublishedAt != nil {
		s := p.PublishedAt.Format(time.RFC3339Nano)
		pubAt = &s
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO publications (id, video_id, platform, external_id, external_url, status, error, published_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID.String(), p.VideoID.String(), p.Platform, p.ExternalID, p.ExternalURL,
		p.Status, p.Error, pubAt, p.CreatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return Publication{}, err
	}
	return p, nil
}

func (s *SQLiteStore) UpdatePublicationStatus(ctx context.Context, id uuid.UUID, status string, errMsg *string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE publications SET status = ?, error = ? WHERE id = ?`, status, errMsg, id.String())
	return err
}

func (s *SQLiteStore) UpdatePublicationPublished(ctx context.Context, id uuid.UUID, externalID, externalURL string) error {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err := s.db.ExecContext(ctx,
		`UPDATE publications SET external_id = ?, external_url = ?, status = 'published', published_at = ? WHERE id = ?`,
		externalID, externalURL, now, id.String())
	return err
}

// ---------------------------------------------------------------------------
// Discovery Runs
// ---------------------------------------------------------------------------

func (s *SQLiteStore) ListDiscoveryRuns(ctx context.Context, limit, offset int32) ([]DiscoveryRun, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, source, products_found, products_new, status, error, started_at, completed_at
		 FROM discovery_runs ORDER BY started_at DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DiscoveryRun
	for rows.Next() {
		var dr DiscoveryRun
		var id, startedAt string
		var completedAt *string
		if err := rows.Scan(&id, &dr.Source, &dr.ProductsFound, &dr.ProductsNew,
			&dr.Status, &dr.Error, &startedAt, &completedAt); err != nil {
			return nil, err
		}
		dr.ID, _ = uuid.Parse(id)
		dr.StartedAt, _ = time.Parse(time.RFC3339Nano, startedAt)
		if completedAt != nil {
			t, _ := time.Parse(time.RFC3339Nano, *completedAt)
			dr.CompletedAt = &t
		}
		out = append(out, dr)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) InsertDiscoveryRun(ctx context.Context, d DiscoveryRun) (DiscoveryRun, error) {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	now := time.Now().UTC()
	if d.StartedAt.IsZero() {
		d.StartedAt = now
	}
	if d.Status == "" {
		d.Status = "running"
	}
	var completedAt *string
	if d.CompletedAt != nil {
		s := d.CompletedAt.Format(time.RFC3339Nano)
		completedAt = &s
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO discovery_runs (id, source, products_found, products_new, status, error, started_at, completed_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		d.ID.String(), d.Source, d.ProductsFound, d.ProductsNew, d.Status, d.Error,
		d.StartedAt.Format(time.RFC3339Nano), completedAt)
	if err != nil {
		return DiscoveryRun{}, err
	}
	return d, nil
}

func (s *SQLiteStore) UpdateDiscoveryRunCompleted(ctx context.Context, id uuid.UUID, productsFound, productsNew int32) error {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err := s.db.ExecContext(ctx,
		`UPDATE discovery_runs SET status = 'completed', products_found = ?, products_new = ?, completed_at = ? WHERE id = ?`,
		productsFound, productsNew, now, id.String())
	return err
}

func (s *SQLiteStore) UpdateDiscoveryRunFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err := s.db.ExecContext(ctx,
		`UPDATE discovery_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`,
		errMsg, now, id.String())
	return err
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// scanProduct scans a single product row from database/sql.
func scanProduct(row *sql.Row) (Product, error) {
	var p Product
	var id, discoveredAt, updatedAt string
	var metaStr *string
	err := row.Scan(&id, &p.Name, &p.URL, &p.Source, &p.Description, &p.Status, &metaStr, &discoveredAt, &updatedAt)
	if err != nil {
		return Product{}, err
	}
	p.ID, _ = uuid.Parse(id)
	p.DiscoveredAt, _ = time.Parse(time.RFC3339Nano, discoveredAt)
	p.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	if metaStr != nil {
		p.Metadata = json.RawMessage(*metaStr)
	}
	return p, nil
}

// scanProducts scans multiple product rows from database/sql.
func scanProducts(rows *sql.Rows) ([]Product, error) {
	var out []Product
	for rows.Next() {
		var p Product
		var id, discoveredAt, updatedAt string
		var metaStr *string
		if err := rows.Scan(&id, &p.Name, &p.URL, &p.Source, &p.Description, &p.Status, &metaStr, &discoveredAt, &updatedAt); err != nil {
			return nil, err
		}
		p.ID, _ = uuid.Parse(id)
		p.DiscoveredAt, _ = time.Parse(time.RFC3339Nano, discoveredAt)
		p.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
		if metaStr != nil {
			p.Metadata = json.RawMessage(*metaStr)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// scanVideosWithProduct scans video+product join rows.
func scanVideosWithProduct(rows *sql.Rows) ([]VideoWithProduct, error) {
	var out []VideoWithProduct
	for rows.Next() {
		var v VideoWithProduct
		var vid, pid, createdAt, updatedAt string
		var sk, format, metaStr *string
		if err := rows.Scan(&vid, &pid, &sk, &v.DurationSec, &v.Status, &format, &metaStr,
			&createdAt, &updatedAt, &v.ProductName); err != nil {
			return nil, err
		}
		v.ID, _ = uuid.Parse(vid)
		v.ProductID, _ = uuid.Parse(pid)
		v.StorageKey = sk
		v.Format = format
		v.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
		v.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
		if metaStr != nil {
			v.Metadata = json.RawMessage(*metaStr)
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

// jsonStr converts json.RawMessage to *string for SQLite storage.
func jsonStr(raw json.RawMessage) *string {
	if raw == nil {
		return nil
	}
	s := string(raw)
	return &s
}
