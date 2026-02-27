-- name: GetScoreByProduct :one
SELECT * FROM scores WHERE product_id = $1;

-- name: InsertScore :one
INSERT INTO scores (product_id, overall, ux_score, performance_score, feature_score, value_score, reasoning, model)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: DeleteScoreByProduct :exec
DELETE FROM scores WHERE product_id = $1;
