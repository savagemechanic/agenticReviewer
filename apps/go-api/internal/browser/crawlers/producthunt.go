package crawlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/agenticreviewer/go-api/internal/browser"
	"github.com/go-rod/rod"
)

const productHuntGraphQLURL = "https://api.producthunt.com/v2/api/graphql"

// graphQL query for today's top posts.
const phQuery = `{
  posts(order: VOTES, first: 20) {
    edges {
      node {
        name
        url
        tagline
        website
      }
    }
  }
}`

type phResponse struct {
	Data struct {
		Posts struct {
			Edges []struct {
				Node struct {
					Name    string `json:"name"`
					URL     string `json:"url"`
					Tagline string `json:"tagline"`
					Website string `json:"website"`
				} `json:"node"`
			} `json:"edges"`
		} `json:"posts"`
	} `json:"data"`
}

// DiscoverFromProductHunt fetches products via the GraphQL API if apiToken is
// provided, otherwise falls back to scraping the homepage with Rod.
func DiscoverFromProductHunt(pool *browser.Pool, apiToken string) ([]DiscoveredProduct, error) {
	if apiToken != "" {
		return discoverPHViaAPI(apiToken)
	}
	return discoverPHViaScrape(pool)
}

func discoverPHViaAPI(apiToken string) ([]DiscoveredProduct, error) {
	body, err := json.Marshal(map[string]string{"query": phQuery})
	if err != nil {
		return nil, fmt.Errorf("marshaling graphql query: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, productHuntGraphQLURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiToken)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("product hunt API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result phResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	var products []DiscoveredProduct
	for _, edge := range result.Data.Posts.Edges {
		node := edge.Node
		productURL := node.Website
		if productURL == "" {
			productURL = node.URL
		}
		products = append(products, DiscoveredProduct{
			Name:        node.Name,
			URL:         productURL,
			Description: node.Tagline,
			Source:      "producthunt",
		})
	}
	return products, nil
}

func discoverPHViaScrape(pool *browser.Pool) ([]DiscoveredProduct, error) {
	var products []DiscoveredProduct

	err := pool.WithPage(context.Background(), func(page *rod.Page) error {
		if err := page.Navigate("https://www.producthunt.com"); err != nil {
			return fmt.Errorf("navigating to producthunt: %w", err)
		}
		if err := page.WaitStable(500); err != nil {
			return fmt.Errorf("waiting for page stable: %w", err)
		}

		// Extract product cards from the homepage.
		items, err := page.Elements(`[data-test="post-item"]`)
		if err != nil {
			// Fallback: try anchor tags in the main feed area.
			items, err = page.Elements(`main a[href^="/posts/"]`)
			if err != nil {
				return fmt.Errorf("finding product elements: %w", err)
			}
		}

		for _, item := range items {
			name, _ := item.Text()
			name = strings.TrimSpace(strings.Split(name, "\n")[0])
			href, err := item.Attribute("href")
			if err != nil || href == nil {
				continue
			}
			productURL := *href
			if !strings.HasPrefix(productURL, "http") {
				productURL = "https://www.producthunt.com" + productURL
			}

			if name != "" {
				products = append(products, DiscoveredProduct{
					Name:   name,
					URL:    productURL,
					Source: "producthunt",
				})
			}
		}
		return nil
	})

	return products, err
}
