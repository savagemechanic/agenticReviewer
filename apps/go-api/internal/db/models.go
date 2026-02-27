package db

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID           uuid.UUID        `json:"id"`
	Name         string           `json:"name"`
	URL          string           `json:"url"`
	Source       string           `json:"source"`
	Description  *string          `json:"description"`
	Status       string           `json:"status"`
	Metadata     json.RawMessage  `json:"metadata"`
	DiscoveredAt time.Time        `json:"discoveredAt"`
	UpdatedAt    time.Time        `json:"updatedAt"`
}

type Screenshot struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"productId"`
	URL       string    `json:"url"`
	PageURL   string    `json:"pageUrl"`
	Type      string    `json:"type"`
	Width     int32     `json:"width"`
	Height    int32     `json:"height"`
	CreatedAt time.Time `json:"createdAt"`
}

type PageExtraction struct {
	ID         uuid.UUID       `json:"id"`
	ProductID  uuid.UUID       `json:"productId"`
	PageURL    string          `json:"pageUrl"`
	Title      *string         `json:"title"`
	Headings   json.RawMessage `json:"headings"`
	BodyText   *string         `json:"bodyText"`
	LoadTimeMs *int32          `json:"loadTimeMs"`
	CreatedAt  time.Time       `json:"createdAt"`
}

type Summary struct {
	ID             uuid.UUID       `json:"id"`
	ProductID      uuid.UUID       `json:"productId"`
	Content        string          `json:"content"`
	TargetAudience *string         `json:"targetAudience"`
	KeyFeatures    json.RawMessage `json:"keyFeatures"`
	Pros           json.RawMessage `json:"pros"`
	Cons           json.RawMessage `json:"cons"`
	Model          *string         `json:"model"`
	CreatedAt      time.Time       `json:"createdAt"`
}

type Score struct {
	ID               uuid.UUID `json:"id"`
	ProductID        uuid.UUID `json:"productId"`
	Overall          float32   `json:"overall"`
	UxScore          float32   `json:"uxScore"`
	PerformanceScore float32   `json:"performanceScore"`
	FeatureScore     float32   `json:"featureScore"`
	ValueScore       float32   `json:"valueScore"`
	Reasoning        *string   `json:"reasoning"`
	Model            *string   `json:"model"`
	CreatedAt        time.Time `json:"createdAt"`
}

type Video struct {
	ID          uuid.UUID       `json:"id"`
	ProductID   uuid.UUID       `json:"productId"`
	StorageKey  *string         `json:"storageKey"`
	DurationSec *int32          `json:"durationSec"`
	Status      string          `json:"status"`
	Format      *string         `json:"format"`
	Metadata    json.RawMessage `json:"metadata"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type VideoWithProduct struct {
	Video
	ProductName string `json:"productName"`
}

type Publication struct {
	ID          uuid.UUID  `json:"id"`
	VideoID     uuid.UUID  `json:"videoId"`
	Platform    string     `json:"platform"`
	ExternalID  *string    `json:"externalId"`
	ExternalURL *string    `json:"externalUrl"`
	Status      string     `json:"status"`
	Error       *string    `json:"error"`
	PublishedAt *time.Time `json:"publishedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type DiscoveryRun struct {
	ID           uuid.UUID  `json:"id"`
	Source       string     `json:"source"`
	ProductsFound int32     `json:"productsFound"`
	ProductsNew  int32      `json:"productsNew"`
	Status       string     `json:"status"`
	Error        *string    `json:"error"`
	StartedAt    time.Time  `json:"startedAt"`
	CompletedAt  *time.Time `json:"completedAt"`
}

// StatusCount holds the result of a count-by-status aggregation.
type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}
