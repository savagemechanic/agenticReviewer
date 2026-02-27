package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
)

// ScoreInput contains the data needed to generate product scores.
type ScoreInput struct {
	ProductName string
	Summary     string
	KeyFeatures []string
	Pros        []string
	Cons        []string
	LoadTimeMs  int
}

// ScoreResult holds the structured scoring output.
type ScoreResult struct {
	Overall          float64 `json:"overall"`
	UXScore          float64 `json:"uxScore"`
	PerformanceScore float64 `json:"performanceScore"`
	FeatureScore     float64 `json:"featureScore"`
	ValueScore       float64 `json:"valueScore"`
	Reasoning        string  `json:"reasoning"`
	Model            string  `json:"model"`
}

// Score generates numerical scores for a product based on its summary data.
// Validates that the overall score is within 1.5 of the average of sub-scores.
func (c *Client) Score(ctx context.Context, input ScoreInput) (ScoreResult, error) {
	prompt := fmt.Sprintf(`You are a professional B2B software reviewer scoring a product. Rate each dimension from 1.0 to 10.0.

Product: %s
Summary: %s
Key Features: %s
Pros: %s
Cons: %s
Page Load Time: %dms

Respond with ONLY valid JSON in this exact format:
{
  "overall": 7.5,
  "uxScore": 7.0,
  "performanceScore": 8.0,
  "featureScore": 7.5,
  "valueScore": 7.0,
  "reasoning": "Brief explanation of the scores"
}`,
		input.ProductName,
		input.Summary,
		strings.Join(input.KeyFeatures, ", "),
		strings.Join(input.Pros, ", "),
		strings.Join(input.Cons, ", "),
		input.LoadTimeMs,
	)

	raw, err := WithRetry(ctx, func() (string, error) {
		return c.Complete(ctx, prompt, WithSystem("You are a B2B SaaS product scorer. Always respond with valid JSON only."))
	}, DefaultRetryOptions())
	if err != nil {
		return ScoreResult{}, fmt.Errorf("score completion: %w", err)
	}

	var result ScoreResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return ScoreResult{}, fmt.Errorf("parsing score JSON: %w (raw: %.200s)", err, raw)
	}

	// Clamp all scores to [1, 10].
	result.Overall = clamp(result.Overall, 1, 10)
	result.UXScore = clamp(result.UXScore, 1, 10)
	result.PerformanceScore = clamp(result.PerformanceScore, 1, 10)
	result.FeatureScore = clamp(result.FeatureScore, 1, 10)
	result.ValueScore = clamp(result.ValueScore, 1, 10)

	// Validate overall vs average of sub-scores (tolerance ±1.5).
	avg := (result.UXScore + result.PerformanceScore + result.FeatureScore + result.ValueScore) / 4.0
	if math.Abs(result.Overall-avg) > 1.5 {
		result.Overall = math.Round(avg*10) / 10
	}

	result.Model = "claude-sonnet-4-20250514"
	return result, nil
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
