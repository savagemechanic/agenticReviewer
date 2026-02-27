package crawlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// skipDomains are domains we filter out — not SaaS product sites.
var skipDomains = map[string]struct{}{
	"reddit.com":    {},
	"imgur.com":     {},
	"youtube.com":   {},
	"youtu.be":      {},
	"twitter.com":   {},
	"x.com":         {},
	"github.com":    {},
	"gist.github.com": {},
	"i.redd.it":     {},
	"v.redd.it":     {},
}

var urlRegex = regexp.MustCompile(`https?://[^\s\)\]"'<>]+`)

type redditListing struct {
	Data struct {
		Children []struct {
			Data struct {
				Title    string `json:"title"`
				URL      string `json:"url"`
				Selftext string `json:"selftext"`
				Domain   string `json:"domain"`
			} `json:"data"`
		} `json:"children"`
	} `json:"data"`
}

// DiscoverFromReddit fetches recent posts from r/SaaS and r/startups using
// Reddit's public JSON API and extracts product URLs.
func DiscoverFromReddit() ([]DiscoveredProduct, error) {
	subreddits := []string{"SaaS", "startups"}
	var products []DiscoveredProduct

	client := &http.Client{Timeout: 15 * time.Second}

	for _, sub := range subreddits {
		url := fmt.Sprintf("https://www.reddit.com/r/%s/new.json?limit=50", sub)
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("creating request for r/%s: %w", sub, err)
		}
		req.Header.Set("User-Agent", "AgenticReviewer/1.0")

		resp, err := client.Do(req)
		if err != nil {
			log.Warn("reddit fetch failed", "subreddit", sub, "error", err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			log.Warn("reddit returned non-200", "subreddit", sub, "status", resp.StatusCode)
			continue
		}

		var listing redditListing
		if err := json.Unmarshal(body, &listing); err != nil {
			log.Warn("reddit json parse failed", "subreddit", sub, "error", err)
			continue
		}

		for _, child := range listing.Data.Children {
			post := child.Data

			// Try the post URL first.
			if post.URL != "" && !isSkipDomain(post.Domain) && !strings.Contains(post.URL, "reddit.com") {
				products = append(products, DiscoveredProduct{
					Name:        truncate(post.Title, 100),
					URL:         post.URL,
					Description: truncate(post.Selftext, 300),
					Source:      "reddit",
				})
				continue
			}

			// Extract URLs from self posts.
			if post.Selftext != "" {
				urls := urlRegex.FindAllString(post.Selftext, -1)
				for _, u := range urls {
					if !isSkipURL(u) {
						products = append(products, DiscoveredProduct{
							Name:        truncate(post.Title, 100),
							URL:         u,
							Description: truncate(post.Selftext, 300),
							Source:      "reddit",
						})
						break // Take only the first valid URL per post.
					}
				}
			}
		}
	}

	return products, nil
}

func isSkipDomain(domain string) bool {
	domain = strings.TrimPrefix(domain, "www.")
	_, skip := skipDomains[domain]
	return skip
}

func isSkipURL(rawURL string) bool {
	for domain := range skipDomains {
		if strings.Contains(rawURL, domain) {
			return true
		}
	}
	return false
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
