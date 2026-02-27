-- name: InsertPublication :one
INSERT INTO publications (video_id, platform, status)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdatePublicationStatus :exec
UPDATE publications SET status = $2, error = $3 WHERE id = $1;

-- name: UpdatePublicationPublished :exec
UPDATE publications SET status = 'published', external_id = $2, external_url = $3, published_at = NOW() WHERE id = $1;
