package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

func (q *Queries) ListProducts(ctx context.Context, limit, offset int32) ([]Product, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products ORDER BY discovered_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Product])
}

func (q *Queries) ListProductsByStatus(ctx context.Context, status string, limit, offset int32) ([]Product, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE status = $1 ORDER BY discovered_at DESC LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by status: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Product])
}

func (q *Queries) ListProductsBySource(ctx context.Context, source string, limit, offset int32) ([]Product, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE source = $1 ORDER BY discovered_at DESC LIMIT $2 OFFSET $3`, source, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by source: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Product])
}

func (q *Queries) ListProductsByStatusAndSource(ctx context.Context, status, source string, limit, offset int32) ([]Product, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE status = $1 AND source = $2 ORDER BY discovered_at DESC LIMIT $3 OFFSET $4`,
		status, source, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by status and source: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Product])
}

func (q *Queries) ListProductsByStatuses(ctx context.Context, statuses []string, limit, offset int32) ([]Product, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE status = ANY($1) ORDER BY discovered_at DESC LIMIT $2 OFFSET $3`, statuses, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list products by statuses: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Product])
}

func (q *Queries) CountProducts(ctx context.Context) (int64, error) {
	var count int64
	err := q.pool.QueryRow(ctx, `SELECT count(*) FROM products`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count products: %w", err)
	}
	return count, nil
}

func (q *Queries) CountProductsByStatus(ctx context.Context, status string) (int64, error) {
	var count int64
	err := q.pool.QueryRow(ctx, `SELECT count(*) FROM products WHERE status = $1`, status).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count products by status: %w", err)
	}
	return count, nil
}

func (q *Queries) CountProductsBySource(ctx context.Context, source string) (int64, error) {
	var count int64
	err := q.pool.QueryRow(ctx, `SELECT count(*) FROM products WHERE source = $1`, source).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count products by source: %w", err)
	}
	return count, nil
}

func (q *Queries) CountProductsByStatusAndSource(ctx context.Context, status, source string) (int64, error) {
	var count int64
	err := q.pool.QueryRow(ctx,
		`SELECT count(*) FROM products WHERE status = $1 AND source = $2`, status, source).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count products by status and source: %w", err)
	}
	return count, nil
}

func (q *Queries) ProductStatusCounts(ctx context.Context) ([]StatusCount, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT status, count(*) AS count FROM products GROUP BY status ORDER BY status`)
	if err != nil {
		return nil, fmt.Errorf("product status counts: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[StatusCount])
}

func (q *Queries) GetProduct(ctx context.Context, id uuid.UUID) (Product, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE id = $1`, id)
	var p Product
	err := row.Scan(&p.ID, &p.Name, &p.URL, &p.Source, &p.Description, &p.Status, &p.Metadata, &p.DiscoveredAt, &p.UpdatedAt)
	if err != nil {
		return Product{}, fmt.Errorf("get product: %w", err)
	}
	return p, nil
}

func (q *Queries) GetProductByURL(ctx context.Context, url string) (Product, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, name, url, source, description, status, metadata, discovered_at, updated_at
		 FROM products WHERE url = $1`, url)
	var p Product
	err := row.Scan(&p.ID, &p.Name, &p.URL, &p.Source, &p.Description, &p.Status, &p.Metadata, &p.DiscoveredAt, &p.UpdatedAt)
	if err != nil {
		return Product{}, fmt.Errorf("get product by url: %w", err)
	}
	return p, nil
}

func (q *Queries) InsertProduct(ctx context.Context, p Product) (Product, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO products (id, name, url, source, description, status, metadata, discovered_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, name, url, source, description, status, metadata, discovered_at, updated_at`,
		p.ID, p.Name, p.URL, p.Source, p.Description, p.Status, p.Metadata, p.DiscoveredAt, p.UpdatedAt)
	var out Product
	err := row.Scan(&out.ID, &out.Name, &out.URL, &out.Source, &out.Description, &out.Status, &out.Metadata, &out.DiscoveredAt, &out.UpdatedAt)
	if err != nil {
		return Product{}, fmt.Errorf("insert product: %w", err)
	}
	return out, nil
}

func (q *Queries) UpdateProductStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE products SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now(), id)
	if err != nil {
		return fmt.Errorf("update product status: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

func (q *Queries) ListScreenshotsByProduct(ctx context.Context, productID uuid.UUID) ([]Screenshot, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, product_id, url, page_url, type, width, height, created_at
		 FROM screenshots WHERE product_id = $1 ORDER BY created_at`, productID)
	if err != nil {
		return nil, fmt.Errorf("list screenshots by product: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Screenshot])
}

func (q *Queries) InsertScreenshot(ctx context.Context, s Screenshot) (Screenshot, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO screenshots (id, product_id, url, page_url, type, width, height, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, product_id, url, page_url, type, width, height, created_at`,
		s.ID, s.ProductID, s.URL, s.PageURL, s.Type, s.Width, s.Height, s.CreatedAt)
	var out Screenshot
	err := row.Scan(&out.ID, &out.ProductID, &out.URL, &out.PageURL, &out.Type, &out.Width, &out.Height, &out.CreatedAt)
	if err != nil {
		return Screenshot{}, fmt.Errorf("insert screenshot: %w", err)
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Page Extractions
// ---------------------------------------------------------------------------

func (q *Queries) GetExtractionByProduct(ctx context.Context, productID uuid.UUID) (PageExtraction, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, product_id, page_url, title, headings, body_text, load_time_ms, created_at
		 FROM page_extractions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`, productID)
	var e PageExtraction
	err := row.Scan(&e.ID, &e.ProductID, &e.PageURL, &e.Title, &e.Headings, &e.BodyText, &e.LoadTimeMs, &e.CreatedAt)
	if err != nil {
		return PageExtraction{}, fmt.Errorf("get extraction by product: %w", err)
	}
	return e, nil
}

func (q *Queries) InsertExtraction(ctx context.Context, e PageExtraction) (PageExtraction, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO page_extractions (id, product_id, page_url, title, headings, body_text, load_time_ms, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, product_id, page_url, title, headings, body_text, load_time_ms, created_at`,
		e.ID, e.ProductID, e.PageURL, e.Title, e.Headings, e.BodyText, e.LoadTimeMs, e.CreatedAt)
	var out PageExtraction
	err := row.Scan(&out.ID, &out.ProductID, &out.PageURL, &out.Title, &out.Headings, &out.BodyText, &out.LoadTimeMs, &out.CreatedAt)
	if err != nil {
		return PageExtraction{}, fmt.Errorf("insert extraction: %w", err)
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

func (q *Queries) GetSummaryByProduct(ctx context.Context, productID uuid.UUID) (Summary, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, product_id, content, target_audience, key_features, pros, cons, model, created_at
		 FROM summaries WHERE product_id = $1`, productID)
	var s Summary
	err := row.Scan(&s.ID, &s.ProductID, &s.Content, &s.TargetAudience, &s.KeyFeatures, &s.Pros, &s.Cons, &s.Model, &s.CreatedAt)
	if err != nil {
		return Summary{}, fmt.Errorf("get summary by product: %w", err)
	}
	return s, nil
}

func (q *Queries) InsertSummary(ctx context.Context, s Summary) (Summary, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO summaries (id, product_id, content, target_audience, key_features, pros, cons, model, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, product_id, content, target_audience, key_features, pros, cons, model, created_at`,
		s.ID, s.ProductID, s.Content, s.TargetAudience, s.KeyFeatures, s.Pros, s.Cons, s.Model, s.CreatedAt)
	var out Summary
	err := row.Scan(&out.ID, &out.ProductID, &out.Content, &out.TargetAudience, &out.KeyFeatures, &out.Pros, &out.Cons, &out.Model, &out.CreatedAt)
	if err != nil {
		return Summary{}, fmt.Errorf("insert summary: %w", err)
	}
	return out, nil
}

func (q *Queries) DeleteSummaryByProduct(ctx context.Context, productID uuid.UUID) error {
	_, err := q.pool.Exec(ctx, `DELETE FROM summaries WHERE product_id = $1`, productID)
	if err != nil {
		return fmt.Errorf("delete summary by product: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

func (q *Queries) GetScoreByProduct(ctx context.Context, productID uuid.UUID) (Score, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, product_id, overall, ux_score, performance_score, feature_score, value_score, reasoning, model, created_at
		 FROM scores WHERE product_id = $1`, productID)
	var s Score
	err := row.Scan(&s.ID, &s.ProductID, &s.Overall, &s.UxScore, &s.PerformanceScore, &s.FeatureScore, &s.ValueScore, &s.Reasoning, &s.Model, &s.CreatedAt)
	if err != nil {
		return Score{}, fmt.Errorf("get score by product: %w", err)
	}
	return s, nil
}

func (q *Queries) InsertScore(ctx context.Context, s Score) (Score, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO scores (id, product_id, overall, ux_score, performance_score, feature_score, value_score, reasoning, model, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, product_id, overall, ux_score, performance_score, feature_score, value_score, reasoning, model, created_at`,
		s.ID, s.ProductID, s.Overall, s.UxScore, s.PerformanceScore, s.FeatureScore, s.ValueScore, s.Reasoning, s.Model, s.CreatedAt)
	var out Score
	err := row.Scan(&out.ID, &out.ProductID, &out.Overall, &out.UxScore, &out.PerformanceScore, &out.FeatureScore, &out.ValueScore, &out.Reasoning, &out.Model, &out.CreatedAt)
	if err != nil {
		return Score{}, fmt.Errorf("insert score: %w", err)
	}
	return out, nil
}

func (q *Queries) DeleteScoreByProduct(ctx context.Context, productID uuid.UUID) error {
	_, err := q.pool.Exec(ctx, `DELETE FROM scores WHERE product_id = $1`, productID)
	if err != nil {
		return fmt.Errorf("delete score by product: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

func (q *Queries) ListVideos(ctx context.Context, limit, offset int32) ([]VideoWithProduct, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT v.id, v.product_id, v.storage_key, v.duration_sec, v.status, v.format, v.metadata, v.created_at, v.updated_at,
		        p.name AS product_name
		 FROM videos v JOIN products p ON v.product_id = p.id
		 ORDER BY v.created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list videos: %w", err)
	}
	defer rows.Close()

	var out []VideoWithProduct
	for rows.Next() {
		var v VideoWithProduct
		if err := rows.Scan(
			&v.ID, &v.ProductID, &v.StorageKey, &v.DurationSec, &v.Status, &v.Format, &v.Metadata,
			&v.CreatedAt, &v.UpdatedAt, &v.ProductName,
		); err != nil {
			return nil, fmt.Errorf("list videos scan: %w", err)
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (q *Queries) ListVideosByStatus(ctx context.Context, status string, limit, offset int32) ([]VideoWithProduct, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT v.id, v.product_id, v.storage_key, v.duration_sec, v.status, v.format, v.metadata, v.created_at, v.updated_at,
		        p.name AS product_name
		 FROM videos v JOIN products p ON v.product_id = p.id
		 WHERE v.status = $1
		 ORDER BY v.created_at DESC LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list videos by status: %w", err)
	}
	defer rows.Close()

	var out []VideoWithProduct
	for rows.Next() {
		var v VideoWithProduct
		if err := rows.Scan(
			&v.ID, &v.ProductID, &v.StorageKey, &v.DurationSec, &v.Status, &v.Format, &v.Metadata,
			&v.CreatedAt, &v.UpdatedAt, &v.ProductName,
		); err != nil {
			return nil, fmt.Errorf("list videos by status scan: %w", err)
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (q *Queries) GetVideo(ctx context.Context, id uuid.UUID) (Video, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at
		 FROM videos WHERE id = $1`, id)
	var v Video
	err := row.Scan(&v.ID, &v.ProductID, &v.StorageKey, &v.DurationSec, &v.Status, &v.Format, &v.Metadata, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return Video{}, fmt.Errorf("get video: %w", err)
	}
	return v, nil
}

func (q *Queries) GetVideoByProduct(ctx context.Context, productID uuid.UUID) (Video, error) {
	row := q.pool.QueryRow(ctx,
		`SELECT id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at
		 FROM videos WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`, productID)
	var v Video
	err := row.Scan(&v.ID, &v.ProductID, &v.StorageKey, &v.DurationSec, &v.Status, &v.Format, &v.Metadata, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return Video{}, fmt.Errorf("get video by product: %w", err)
	}
	return v, nil
}

func (q *Queries) InsertVideo(ctx context.Context, v Video) (Video, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO videos (id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, product_id, storage_key, duration_sec, status, format, metadata, created_at, updated_at`,
		v.ID, v.ProductID, v.StorageKey, v.DurationSec, v.Status, v.Format, v.Metadata, v.CreatedAt, v.UpdatedAt)
	var out Video
	err := row.Scan(&out.ID, &out.ProductID, &out.StorageKey, &out.DurationSec, &out.Status, &out.Format, &out.Metadata, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return Video{}, fmt.Errorf("insert video: %w", err)
	}
	return out, nil
}

func (q *Queries) UpdateVideoStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE videos SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now(), id)
	if err != nil {
		return fmt.Errorf("update video status: %w", err)
	}
	return nil
}

func (q *Queries) UpdateVideoRendered(ctx context.Context, id uuid.UUID, storageKey string, durationSec int32, format string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE videos SET storage_key = $1, duration_sec = $2, format = $3, status = 'rendered', updated_at = $4 WHERE id = $5`,
		storageKey, durationSec, format, time.Now(), id)
	if err != nil {
		return fmt.Errorf("update video rendered: %w", err)
	}
	return nil
}

func (q *Queries) UpdateVideoMetadata(ctx context.Context, id uuid.UUID, metadata []byte) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE videos SET metadata = $1, updated_at = $2 WHERE id = $3`, metadata, time.Now(), id)
	if err != nil {
		return fmt.Errorf("update video metadata: %w", err)
	}
	return nil
}

func (q *Queries) VideoStatusCounts(ctx context.Context) ([]StatusCount, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT status, count(*) AS count FROM videos GROUP BY status ORDER BY status`)
	if err != nil {
		return nil, fmt.Errorf("video status counts: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[StatusCount])
}

// ---------------------------------------------------------------------------
// Publications
// ---------------------------------------------------------------------------

func (q *Queries) InsertPublication(ctx context.Context, p Publication) (Publication, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO publications (id, video_id, platform, external_id, external_url, status, error, published_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, video_id, platform, external_id, external_url, status, error, published_at, created_at`,
		p.ID, p.VideoID, p.Platform, p.ExternalID, p.ExternalURL, p.Status, p.Error, p.PublishedAt, p.CreatedAt)
	var out Publication
	err := row.Scan(&out.ID, &out.VideoID, &out.Platform, &out.ExternalID, &out.ExternalURL, &out.Status, &out.Error, &out.PublishedAt, &out.CreatedAt)
	if err != nil {
		return Publication{}, fmt.Errorf("insert publication: %w", err)
	}
	return out, nil
}

func (q *Queries) UpdatePublicationStatus(ctx context.Context, id uuid.UUID, status string, errMsg *string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE publications SET status = $1, error = $2 WHERE id = $3`, status, errMsg, id)
	if err != nil {
		return fmt.Errorf("update publication status: %w", err)
	}
	return nil
}

func (q *Queries) UpdatePublicationPublished(ctx context.Context, id uuid.UUID, externalID, externalURL string) error {
	now := time.Now()
	_, err := q.pool.Exec(ctx,
		`UPDATE publications SET external_id = $1, external_url = $2, status = 'published', published_at = $3 WHERE id = $4`,
		externalID, externalURL, now, id)
	if err != nil {
		return fmt.Errorf("update publication published: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Discovery Runs
// ---------------------------------------------------------------------------

func (q *Queries) ListDiscoveryRuns(ctx context.Context, limit, offset int32) ([]DiscoveryRun, error) {
	rows, err := q.pool.Query(ctx,
		`SELECT id, source, products_found, products_new, status, error, started_at, completed_at
		 FROM discovery_runs ORDER BY started_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list discovery runs: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[DiscoveryRun])
}

func (q *Queries) InsertDiscoveryRun(ctx context.Context, d DiscoveryRun) (DiscoveryRun, error) {
	row := q.pool.QueryRow(ctx,
		`INSERT INTO discovery_runs (id, source, products_found, products_new, status, error, started_at, completed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, source, products_found, products_new, status, error, started_at, completed_at`,
		d.ID, d.Source, d.ProductsFound, d.ProductsNew, d.Status, d.Error, d.StartedAt, d.CompletedAt)
	var out DiscoveryRun
	err := row.Scan(&out.ID, &out.Source, &out.ProductsFound, &out.ProductsNew, &out.Status, &out.Error, &out.StartedAt, &out.CompletedAt)
	if err != nil {
		return DiscoveryRun{}, fmt.Errorf("insert discovery run: %w", err)
	}
	return out, nil
}

func (q *Queries) UpdateDiscoveryRunCompleted(ctx context.Context, id uuid.UUID, productsFound, productsNew int32) error {
	now := time.Now()
	_, err := q.pool.Exec(ctx,
		`UPDATE discovery_runs SET status = 'completed', products_found = $1, products_new = $2, completed_at = $3 WHERE id = $4`,
		productsFound, productsNew, now, id)
	if err != nil {
		return fmt.Errorf("update discovery run completed: %w", err)
	}
	return nil
}

func (q *Queries) UpdateDiscoveryRunFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	now := time.Now()
	_, err := q.pool.Exec(ctx,
		`UPDATE discovery_runs SET status = 'failed', error = $1, completed_at = $2 WHERE id = $3`,
		errMsg, now, id)
	if err != nil {
		return fmt.Errorf("update discovery run failed: %w", err)
	}
	return nil
}
