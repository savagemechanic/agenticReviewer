-- name: ListVideos :many
SELECT v.id, v.product_id, p.name as product_name, v.storage_key, v.duration_sec,
       v.status, v.format, v.metadata, v.created_at, v.updated_at
FROM videos v
INNER JOIN products p ON v.product_id = p.id
ORDER BY v.created_at DESC;

-- name: ListVideosByStatus :many
SELECT v.id, v.product_id, p.name as product_name, v.storage_key, v.duration_sec,
       v.status, v.format, v.metadata, v.created_at, v.updated_at
FROM videos v
INNER JOIN products p ON v.product_id = p.id
WHERE v.status = $1
ORDER BY v.created_at DESC;

-- name: GetVideo :one
SELECT * FROM videos WHERE id = $1;

-- name: GetVideoByProduct :one
SELECT * FROM videos WHERE product_id = $1 LIMIT 1;

-- name: InsertVideo :one
INSERT INTO videos (product_id, storage_key, duration_sec, status, format)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateVideoStatus :exec
UPDATE videos SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: UpdateVideoRendered :exec
UPDATE videos SET storage_key = $2, duration_sec = $3, status = 'rendered', updated_at = NOW() WHERE id = $1;

-- name: UpdateVideoMetadata :exec
UPDATE videos SET status = $2, metadata = $3, updated_at = NOW() WHERE id = $1;

-- name: VideoStatusCounts :many
SELECT status, count(*)::int as count FROM videos GROUP BY status;
