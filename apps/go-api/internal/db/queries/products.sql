-- name: ListProducts :many
SELECT * FROM products
ORDER BY discovered_at DESC
LIMIT $1 OFFSET $2;

-- name: ListProductsByStatus :many
SELECT * FROM products
WHERE status = $1
ORDER BY discovered_at DESC
LIMIT $2 OFFSET $3;

-- name: ListProductsBySource :many
SELECT * FROM products
WHERE source = $1
ORDER BY discovered_at DESC
LIMIT $2 OFFSET $3;

-- name: ListProductsByStatusAndSource :many
SELECT * FROM products
WHERE status = $1 AND source = $2
ORDER BY discovered_at DESC
LIMIT $3 OFFSET $4;

-- name: CountProducts :one
SELECT count(*)::int FROM products;

-- name: CountProductsByStatus :one
SELECT count(*)::int FROM products WHERE status = $1;

-- name: CountProductsBySource :one
SELECT count(*)::int FROM products WHERE source = $1;

-- name: CountProductsByStatusAndSource :one
SELECT count(*)::int FROM products WHERE status = $1 AND source = $2;

-- name: GetProduct :one
SELECT * FROM products WHERE id = $1;

-- name: GetProductByURL :one
SELECT * FROM products WHERE url = $1;

-- name: InsertProduct :one
INSERT INTO products (name, url, source, description)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateProductStatus :exec
UPDATE products SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: ListProductsByStatuses :many
SELECT * FROM products
WHERE status = ANY($1::varchar[])
ORDER BY discovered_at DESC;

-- name: ProductStatusCounts :many
SELECT status, count(*)::int as count FROM products GROUP BY status;
