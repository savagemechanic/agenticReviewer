package storage

import "context"

// ObjectStore is the interface for object/blob storage operations.
// Implementations: MinIOClient (S3-compatible), FilesystemStore (local disk).
type ObjectStore interface {
	Upload(ctx context.Context, key string, data []byte, contentType string) (url string, err error)
	Download(ctx context.Context, key string) ([]byte, error)
	Remove(ctx context.Context, key string) error
	GetPublicURL(key string) string
}
