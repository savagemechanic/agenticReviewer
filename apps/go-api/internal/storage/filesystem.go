package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// FilesystemStore implements ObjectStore using local filesystem.
// Files are stored under baseDir/{key}. Public URLs are served via
// an HTTP file server mounted at /files/*.
type FilesystemStore struct {
	baseDir  string
	baseURL  string
}

// NewFilesystemStore creates a filesystem-backed object store.
// baseDir is the root directory for stored files.
// httpPort is used to construct public URLs (e.g., http://localhost:3001/files/...).
func NewFilesystemStore(baseDir string, httpPort int) (*FilesystemStore, error) {
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return nil, fmt.Errorf("create storage dir %q: %w", baseDir, err)
	}
	return &FilesystemStore{
		baseDir: baseDir,
		baseURL: fmt.Sprintf("http://localhost:%d/files", httpPort),
	}, nil
}

func (f *FilesystemStore) Upload(_ context.Context, key string, data []byte, _ string) (string, error) {
	path := filepath.Join(f.baseDir, key)
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create dir for key %q: %w", key, err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", fmt.Errorf("write file %q: %w", key, err)
	}
	url := f.GetPublicURL(key)
	log.Info("uploaded object", "key", key, "size", len(data), "url", url)
	return url, nil
}

func (f *FilesystemStore) Download(_ context.Context, key string) ([]byte, error) {
	path := filepath.Join(f.baseDir, key)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file %q: %w", key, err)
	}
	return data, nil
}

func (f *FilesystemStore) Remove(_ context.Context, key string) error {
	path := filepath.Join(f.baseDir, key)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove file %q: %w", key, err)
	}
	log.Info("removed object", "key", key)
	return nil
}

func (f *FilesystemStore) GetPublicURL(key string) string {
	return fmt.Sprintf("%s/%s", f.baseURL, key)
}

// BaseDir returns the filesystem root for mounting with http.FileServer.
func (f *FilesystemStore) BaseDir() string {
	return f.baseDir
}
