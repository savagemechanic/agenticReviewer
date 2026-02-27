package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

// decodeJSON reads the request body as JSON and decodes it into T.
// Returns an error if the body is missing or contains invalid JSON.
func decodeJSON[T any](r *http.Request) (T, error) {
	var v T
	if r.Body == nil {
		return v, fmt.Errorf("request body is empty")
	}
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&v); err != nil {
		return v, fmt.Errorf("invalid JSON: %w", err)
	}
	return v, nil
}

// parseUUID parses a string as a UUID, returning a descriptive error on failure.
func parseUUID(s string) (uuid.UUID, error) {
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid UUID %q: %w", s, err)
	}
	return id, nil
}
