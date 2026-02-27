package grpc

import (
	"context"

	"github.com/agenticreviewer/go-api/internal/pipeline"
)

// PipelineServer implements the ProcessAll RPC by delegating to the existing
// pipeline.ProcessAll function. Individual stage RPCs (Discover, Process,
// Summarize, Score, Render, Distribute) will be implemented when gRPC
// service definitions are generated from the proto file.
//
// For now, the worker mode calls pipeline stages directly — gRPC is the
// transport layer for split-process deployments.
type PipelineServer struct {
	deps *ServiceDeps
}

// NewPipelineServer creates a PipelineServer with the given dependencies.
func NewPipelineServer(deps *ServiceDeps) *PipelineServer {
	return &PipelineServer{deps: deps}
}

// ProcessAll runs all pipeline stages on eligible products.
func (s *PipelineServer) ProcessAll(ctx context.Context) ([]pipeline.StageResult, error) {
	pipelineDeps := &pipeline.Dependencies{
		DB:      s.deps.Store,
		Pool:    s.deps.Browser,
		Storage: s.deps.ObjStore,
		LLM:     s.deps.LLM,
	}
	if s.deps.Config != nil {
		pipelineDeps.Config = *s.deps.Config
	}
	return pipeline.ProcessAll(ctx, pipelineDeps)
}
