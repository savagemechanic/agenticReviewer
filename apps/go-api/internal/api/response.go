package api

import (
	"encoding/json"
	"net/http"
)

// ApiResponse is the standard envelope for all JSON responses.
// Data always serializes (even if empty slice) to ensure consistent API shape.
type ApiResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// SuccessResponse always includes the data field, even for empty slices.
type SuccessResponse[T any] struct {
	Success bool `json:"success"`
	Data    T    `json:"data"`
}

// PaginatedResponse wraps a data slice with pagination metadata.
type PaginatedResponse[T any] struct {
	Success    bool       `json:"success"`
	Data       T          `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// Pagination holds offset-based pagination metadata.
type Pagination struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// writeJSON serializes resp as JSON and writes it with the given HTTP status code.
func writeJSON[T any](w http.ResponseWriter, status int, resp T) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}

// writeSuccess writes a successful response with HTTP 200.
// Uses SuccessResponse to ensure data field is always present.
func writeSuccess[T any](w http.ResponseWriter, data T) {
	writeJSON(w, http.StatusOK, SuccessResponse[T]{
		Success: true,
		Data:    data,
	})
}

// writeError writes a failed ApiResponse with the given HTTP status and message.
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, ApiResponse[any]{
		Success: false,
		Error:   msg,
	})
}

// writePaginated writes a PaginatedResponse with HTTP 200.
func writePaginated[T any](w http.ResponseWriter, data T, pagination Pagination) {
	writeJSON(w, http.StatusOK, PaginatedResponse[T]{
		Success:    true,
		Data:       data,
		Pagination: pagination,
	})
}
