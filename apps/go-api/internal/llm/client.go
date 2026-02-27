package llm

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/agenticreviewer/go-api/internal/logger"
	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

var log *slog.Logger = logger.New("llm")

var markdownFenceRe = regexp.MustCompile("(?s)^```(?:json)?\\s*\n?(.*?)\\s*```$")

// Client wraps the Anthropic SDK for Claude completions.
type Client struct {
	client anthropic.Client
	apiKey string
}

// Option configures a completion request.
type Option func(*completionConfig)

type completionConfig struct {
	model      string
	maxTokens  int64
	systemMsg  string
	timeout    time.Duration
}

func defaultConfig() completionConfig {
	return completionConfig{
		model:     "claude-sonnet-4-20250514",
		maxTokens: 4096,
		timeout:   30 * time.Second,
	}
}

// WithModel sets the model ID.
func WithModel(model string) Option {
	return func(c *completionConfig) { c.model = model }
}

// WithMaxTokens sets the max output tokens.
func WithMaxTokens(n int64) Option {
	return func(c *completionConfig) { c.maxTokens = n }
}

// WithSystem sets a system message.
func WithSystem(msg string) Option {
	return func(c *completionConfig) { c.systemMsg = msg }
}

// WithTimeout sets the request timeout.
func WithTimeout(d time.Duration) Option {
	return func(c *completionConfig) { c.timeout = d }
}

// NewClient creates an Anthropic API client.
func NewClient(apiKey string) *Client {
	client := anthropic.NewClient(option.WithAPIKey(apiKey))
	return &Client{client: client, apiKey: apiKey}
}

// Complete sends a single-turn message to Claude and returns the text response.
func (c *Client) Complete(ctx context.Context, prompt string, opts ...Option) (string, error) {
	cfg := defaultConfig()
	for _, opt := range opts {
		opt(&cfg)
	}

	ctx, cancel := context.WithTimeout(ctx, cfg.timeout)
	defer cancel()

	params := anthropic.MessageNewParams{
		Model:     anthropic.Model(cfg.model),
		MaxTokens: cfg.maxTokens,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(prompt)),
		},
	}

	if cfg.systemMsg != "" {
		params.System = []anthropic.TextBlockParam{
			{Text: cfg.systemMsg},
		}
	}

	resp, err := c.client.Messages.New(ctx, params)
	if err != nil {
		return "", fmt.Errorf("anthropic completion: %w", err)
	}

	var text string
	for _, block := range resp.Content {
		if block.Type == "text" {
			text += block.Text
		}
	}

	text = stripMarkdownFences(strings.TrimSpace(text))
	return text, nil
}

// stripMarkdownFences removes ```json ... ``` wrappers from LLM responses.
func stripMarkdownFences(s string) string {
	if matches := markdownFenceRe.FindStringSubmatch(s); len(matches) > 1 {
		return matches[1]
	}
	return s
}
