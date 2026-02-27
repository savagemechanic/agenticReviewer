package distribute

import (
	"context"
	"fmt"
)

// InstagramConfig holds Instagram API credentials (stub).
type InstagramConfig struct {
	AccessToken string
	AccountID   string
}

// InstagramResult contains the upload response (stub).
type InstagramResult struct {
	MediaID string
	URL     string
}

// UploadToInstagram is a stub — Instagram distribution is not yet configured.
func UploadToInstagram(_ context.Context, _ InstagramConfig, _ []byte, _, _ string, _ []string) (InstagramResult, error) {
	return InstagramResult{}, fmt.Errorf("instagram: distribution not configured")
}
