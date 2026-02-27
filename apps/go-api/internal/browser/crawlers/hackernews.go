package crawlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	hnBaseURL       = "https://hacker-news.firebaseio.com/v0"
	hnMaxStories    = 30
	hnFetchWorkers  = 10
)

type hnItem struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
	Text  string `json:"text"`
	Type  string `json:"type"`
}

// DiscoverFromHackerNews fetches Show HN stories from the Firebase API.
// It uses a worker pool pattern (bounded parallelism) to fetch individual
// story items — O(n) HTTP calls but bounded to hnFetchWorkers goroutines.
func DiscoverFromHackerNews() ([]DiscoveredProduct, error) {
	client := &http.Client{Timeout: 15 * time.Second}

	// Fetch show story IDs.
	ids, err := fetchHNStoryIDs(client)
	if err != nil {
		return nil, err
	}

	if len(ids) > hnMaxStories {
		ids = ids[:hnMaxStories]
	}

	// Fan-out with bounded workers to fetch each item.
	type indexedProduct struct {
		index   int
		product *DiscoveredProduct
	}

	var (
		mu       sync.Mutex
		products []DiscoveredProduct
		wg       sync.WaitGroup
		sem      = make(chan struct{}, hnFetchWorkers)
	)

	wg.Add(len(ids))
	for _, id := range ids {
		sem <- struct{}{}
		go func(storyID int) {
			defer wg.Done()
			defer func() { <-sem }()

			item, err := fetchHNItem(client, storyID)
			if err != nil {
				log.Warn("failed to fetch HN item", "id", storyID, "error", err)
				return
			}

			if item.URL == "" || strings.Contains(item.URL, "ycombinator.com") {
				return
			}

			mu.Lock()
			products = append(products, DiscoveredProduct{
				Name:        item.Title,
				URL:         item.URL,
				Description: truncate(item.Text, 300),
				Source:      "hackernews",
			})
			mu.Unlock()
		}(id)
	}

	wg.Wait()
	return products, nil
}

func fetchHNStoryIDs(client *http.Client) ([]int, error) {
	resp, err := client.Get(hnBaseURL + "/showstories.json")
	if err != nil {
		return nil, fmt.Errorf("fetching show stories: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading show stories response: %w", err)
	}

	var ids []int
	if err := json.Unmarshal(body, &ids); err != nil {
		return nil, fmt.Errorf("parsing show stories: %w", err)
	}
	return ids, nil
}

func fetchHNItem(client *http.Client, id int) (hnItem, error) {
	url := fmt.Sprintf("%s/item/%d.json", hnBaseURL, id)
	resp, err := client.Get(url)
	if err != nil {
		return hnItem{}, fmt.Errorf("fetching item %d: %w", id, err)
	}
	defer resp.Body.Close()

	var item hnItem
	if err := json.NewDecoder(resp.Body).Decode(&item); err != nil {
		return hnItem{}, fmt.Errorf("decoding item %d: %w", id, err)
	}
	return item, nil
}
