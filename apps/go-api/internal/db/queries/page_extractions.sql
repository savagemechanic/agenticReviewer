-- name: GetExtractionByProduct :one
SELECT * FROM page_extractions WHERE product_id = $1 LIMIT 1;

-- name: InsertExtraction :one
INSERT INTO page_extractions (product_id, page_url, title, headings, body_text, load_time_ms)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
