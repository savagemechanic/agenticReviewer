package distribute

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"

	"github.com/agenticreviewer/go-api/internal/logger"
	"golang.org/x/oauth2"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

var log *slog.Logger = logger.New("distribute")

// YouTubeConfig holds OAuth2 credentials for the YouTube Data API.
type YouTubeConfig struct {
	ClientID     string
	ClientSecret string
	RefreshToken string
}

// YouTubeResult contains the upload response.
type YouTubeResult struct {
	VideoID string
	URL     string
}

// UploadToYouTube uploads a video to YouTube using the v3 API with OAuth2.
// Category 28 = Science & Technology.
func UploadToYouTube(ctx context.Context, cfg YouTubeConfig, video []byte, title, description string, tags []string) (YouTubeResult, error) {
	if cfg.ClientID == "" || cfg.ClientSecret == "" || cfg.RefreshToken == "" {
		return YouTubeResult{}, fmt.Errorf("youtube: credentials not configured")
	}

	oauthCfg := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			TokenURL: "https://oauth2.googleapis.com/token",
		},
	}

	token := &oauth2.Token{RefreshToken: cfg.RefreshToken}
	tokenSource := oauthCfg.TokenSource(ctx, token)

	svc, err := youtube.NewService(ctx, option.WithTokenSource(tokenSource))
	if err != nil {
		return YouTubeResult{}, fmt.Errorf("creating youtube service: %w", err)
	}

	upload := &youtube.Video{
		Snippet: &youtube.VideoSnippet{
			Title:       title,
			Description: description,
			Tags:        tags,
			CategoryId:  "28",
		},
		Status: &youtube.VideoStatus{
			PrivacyStatus: "private",
		},
	}

	call := svc.Videos.Insert([]string{"snippet", "status"}, upload)
	resp, err := call.Media(bytes.NewReader(video)).Do()
	if err != nil {
		return YouTubeResult{}, fmt.Errorf("uploading video: %w", err)
	}

	result := YouTubeResult{
		VideoID: resp.Id,
		URL:     fmt.Sprintf("https://www.youtube.com/watch?v=%s", resp.Id),
	}

	log.Info("uploaded to youtube", "videoId", result.VideoID, "url", result.URL)
	return result, nil
}
