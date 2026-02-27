package api

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/agenticreviewer/go-api/internal/db"
	"github.com/go-chi/chi/v5"
)

// productDetail extends Product with related entities for the detail endpoint.
type productDetail struct {
	db.Product
	Screenshots []db.Screenshot `json:"screenshots"`
	Summary     *db.Summary     `json:"summary"`
	Score       *db.Score       `json:"score"`
}

func handleListProducts(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		status := r.URL.Query().Get("status")
		source := r.URL.Query().Get("source")

		limit := int32(50)
		if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
			limit = int32(l)
		}
		if limit > 100 {
			limit = 100
		}

		offset := int32(0)
		if o, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && o >= 0 {
			offset = int32(o)
		}

		var products []db.Product
		var err error
		var total int64

		// Route to appropriate Store method based on filters.
		switch {
		case status != "" && source != "":
			products, err = deps.Store.ListProductsByStatusAndSource(ctx, status, source, limit, offset)
			if err == nil {
				total, err = deps.Store.CountProductsByStatusAndSource(ctx, status, source)
			}
		case status != "":
			products, err = deps.Store.ListProductsByStatus(ctx, status, limit, offset)
			if err == nil {
				total, err = deps.Store.CountProductsByStatus(ctx, status)
			}
		case source != "":
			products, err = deps.Store.ListProductsBySource(ctx, source, limit, offset)
			if err == nil {
				total, err = deps.Store.CountProductsBySource(ctx, source)
			}
		default:
			products, err = deps.Store.ListProducts(ctx, limit, offset)
			if err == nil {
				total, err = deps.Store.CountProducts(ctx)
			}
		}

		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if products == nil {
			products = []db.Product{}
		}

		writePaginated(w, products, Pagination{Total: int(total), Limit: int(limit), Offset: int(offset)})
	}
}

func handleGetProduct(deps *Dependencies) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		idStr := chi.URLParam(r, "id")
		id, err := parseUUID(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		p, err := deps.Store.GetProduct(ctx, id)
		if err != nil {
			if isNotFound(err) {
				writeError(w, http.StatusNotFound, "Not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		screenshots, _ := deps.Store.ListScreenshotsByProduct(ctx, id)
		if screenshots == nil {
			screenshots = []db.Screenshot{}
		}

		var summary *db.Summary
		if s, err := deps.Store.GetSummaryByProduct(ctx, id); err == nil {
			summary = &s
		}

		var score *db.Score
		if s, err := deps.Store.GetScoreByProduct(ctx, id); err == nil {
			score = &s
		}

		detail := productDetail{
			Product:     p,
			Screenshots: screenshots,
			Summary:     summary,
			Score:       score,
		}

		writeSuccess(w, detail)
	}
}

// isNotFound checks if the error represents a "not found" condition
// for both pgx and database/sql drivers. Uses string matching because
// the error may be wrapped by fmt.Errorf with %w.
func isNotFound(err error) bool {
	if err == sql.ErrNoRows {
		return true
	}
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	return strings.Contains(err.Error(), "no rows in result set")
}
