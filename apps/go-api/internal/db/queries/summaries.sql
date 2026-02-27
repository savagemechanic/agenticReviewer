-- name: GetSummaryByProduct :one
SELECT * FROM summaries WHERE product_id = $1;

-- name: InsertSummary :one
INSERT INTO summaries (product_id, content, target_audience, key_features, pros, cons, model)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: DeleteSummaryByProduct :exec
DELETE FROM summaries WHERE product_id = $1;
