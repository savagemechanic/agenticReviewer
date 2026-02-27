package distribute

import (
	"context"
	"fmt"
)

// TikTokConfig holds TikTok API credentials (stub).
type TikTokConfig struct {
	AccessToken string
}

// TikTokResult contains the upload response (stub).
type TikTokResult struct {
	VideoID string
	URL     string
}

// UploadToTikTok is a stub — TikTok distribution is not yet configured.
func UploadToTikTok(_ context.Context, _ TikTokConfig, _ []byte, _, _ string, _ []string) (TikTokResult, error) {
	return TikTokResult{}, fmt.Errorf("tiktok: distribution not configured")
}
