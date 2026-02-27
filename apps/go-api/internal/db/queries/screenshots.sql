-- name: ListScreenshotsByProduct :many
SELECT * FROM screenshots WHERE product_id = $1;

-- name: InsertScreenshot :one
INSERT INTO screenshots (product_id, url, page_url, type, width, height)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
