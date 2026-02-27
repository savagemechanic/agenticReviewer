package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var log *slog.Logger = logger.New("storage")

// Client wraps a MinIO client with a default bucket.
type Client struct {
	client   *minio.Client
	bucket   string
	endpoint string
}

// NewClient creates a MinIO client and ensures the bucket exists.
func NewClient(endpoint string, port int, accessKey, secretKey, bucket string) (*Client, error) {
	addr := fmt.Sprintf("%s:%d", endpoint, port)

	mc, err := minio.New(addr, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		return nil, fmt.Errorf("creating minio client: %w", err)
	}

	ctx := context.Background()
	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("checking bucket existence: %w", err)
	}
	if !exists {
		if err := mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("creating bucket %q: %w", bucket, err)
		}
		log.Info("created bucket", "bucket", bucket)
	}

	return &Client{
		client:   mc,
		bucket:   bucket,
		endpoint: addr,
	}, nil
}

// Upload stores data under the given key and returns the public URL.
func (c *Client) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	reader := bytes.NewReader(data)
	_, err := c.client.PutObject(ctx, c.bucket, key, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("uploading object %q: %w", key, err)
	}

	url := c.GetPublicURL(key)
	log.Info("uploaded object", "key", key, "size", len(data), "url", url)
	return url, nil
}

// Download retrieves the object stored under key.
func (c *Client) Download(ctx context.Context, key string) ([]byte, error) {
	obj, err := c.client.GetObject(ctx, c.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("getting object %q: %w", key, err)
	}
	defer obj.Close()

	data, err := io.ReadAll(obj)
	if err != nil {
		return nil, fmt.Errorf("reading object %q: %w", key, err)
	}
	return data, nil
}

// Remove deletes the object stored under key.
func (c *Client) Remove(ctx context.Context, key string) error {
	if err := c.client.RemoveObject(ctx, c.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("removing object %q: %w", key, err)
	}
	log.Info("removed object", "key", key)
	return nil
}

// GetPublicURL returns the HTTP URL for the given key.
func (c *Client) GetPublicURL(key string) string {
	return fmt.Sprintf("http://%s/%s/%s", c.endpoint, c.bucket, key)
}
