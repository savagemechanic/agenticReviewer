package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

const maxBodyTextChars = 8000

// SummaryInput contains the page data needed to generate a product summary.
type SummaryInput struct {
	ProductName string
	ProductURL  string
	PageTitle   string
	Headings    []string
	BodyText    string
	LoadTimeMs  int
}

// SummaryResult holds the structured output of a product summary.
type SummaryResult struct {
	Content        string   `json:"content"`
	TargetAudience string   `json:"targetAudience"`
	KeyFeatures    []string `json:"keyFeatures"`
	Pros           []string `json:"pros"`
	Cons           []string `json:"cons"`
	Model          string   `json:"model"`
}

// Summarize generates an AI product summary from page extraction data.
// Truncates body text to 8000 chars to stay within context limits.
func (c *Client) Summarize(ctx context.Context, input SummaryInput) (SummaryResult, error) {
	bodyText := input.BodyText
	if len(bodyText) > maxBodyTextChars {
		bodyText = bodyText[:maxBodyTextChars]
	}

	prompt := fmt.Sprintf(`You are a professional B2B software reviewer. Analyze this product and provide a structured review.

Product: %s
URL: %s
Page Title: %s
Headings: %s
Body Text: %s
Load Time: %dms

Respond with ONLY valid JSON in this exact format:
{
  "content": "A 2-3 paragraph professional review of the product",
  "targetAudience": "Who this product is best suited for",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"]
}`,
		input.ProductName,
		input.ProductURL,
		input.PageTitle,
		strings.Join(input.Headings, ", "),
		bodyText,
		input.LoadTimeMs,
	)

	raw, err := WithRetry(ctx, func() (string, error) {
		return c.Complete(ctx, prompt, WithSystem("You are a B2B SaaS product reviewer. Always respond with valid JSON only."))
	}, DefaultRetryOptions())
	if err != nil {
		return SummaryResult{}, fmt.Errorf("summarize completion: %w", err)
	}

	var result SummaryResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		// Fallback: attempt regex extraction for each field.
		result = extractSummaryFallback(raw)
		if result.Content == "" {
			return SummaryResult{}, fmt.Errorf("parsing summary JSON: %w (raw: %.200s)", err, raw)
		}
	}

	result.Model = "claude-sonnet-4-20250514"
	return result, nil
}

// extractSummaryFallback uses regex to pull fields from malformed JSON responses.
func extractSummaryFallback(raw string) SummaryResult {
	return SummaryResult{
		Content:        extractJSONString(raw, "content"),
		TargetAudience: extractJSONString(raw, "targetAudience"),
		KeyFeatures:    extractJSONArray(raw, "keyFeatures"),
		Pros:           extractJSONArray(raw, "pros"),
		Cons:           extractJSONArray(raw, "cons"),
	}
}

func extractJSONString(raw, key string) string {
	re := regexp.MustCompile(fmt.Sprintf(`"%s"\s*:\s*"((?:[^"\\]|\\.)*)"`, key))
	matches := re.FindStringSubmatch(raw)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

func extractJSONArray(raw, key string) []string {
	re := regexp.MustCompile(fmt.Sprintf(`"%s"\s*:\s*\[([^\]]*)\]`, key))
	matches := re.FindStringSubmatch(raw)
	if len(matches) < 2 {
		return nil
	}

	var items []string
	itemRe := regexp.MustCompile(`"((?:[^"\\]|\\.)*)"`)
	for _, m := range itemRe.FindAllStringSubmatch(matches[1], -1) {
		if len(m) > 1 {
			items = append(items, m[1])
		}
	}
	return items
}
