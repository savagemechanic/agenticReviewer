-- name: ListDiscoveryRuns :many
SELECT * FROM discovery_runs ORDER BY started_at DESC LIMIT $1;

-- name: InsertDiscoveryRun :one
INSERT INTO discovery_runs (source, status)
VALUES ($1, 'running')
RETURNING *;

-- name: UpdateDiscoveryRunCompleted :exec
UPDATE discovery_runs SET status = 'completed', products_found = $2, products_new = $3, completed_at = NOW() WHERE id = $1;

-- name: UpdateDiscoveryRunFailed :exec
UPDATE discovery_runs SET status = 'failed', error = $2, completed_at = NOW() WHERE id = $1;
