CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(512) NOT NULL,
    url TEXT NOT NULL,
    source VARCHAR(64) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'discovered',
    metadata JSONB,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_source_idx ON products(source);

-- Screenshots
CREATE TABLE IF NOT EXISTS screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    url TEXT NOT NULL,
    page_url TEXT NOT NULL,
    type VARCHAR(32) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS screenshots_product_id_idx ON screenshots(product_id);

-- Page Extractions
CREATE TABLE IF NOT EXISTS page_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    page_url TEXT NOT NULL,
    title TEXT,
    headings JSONB,
    body_text TEXT,
    load_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS page_extractions_product_id_idx ON page_extractions(product_id);

-- Summaries
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id),
    content TEXT NOT NULL,
    target_audience TEXT,
    key_features JSONB,
    pros JSONB,
    cons JSONB,
    model VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS summaries_product_id_idx ON summaries(product_id);

-- Scores
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id),
    overall REAL NOT NULL,
    ux_score REAL NOT NULL,
    performance_score REAL NOT NULL,
    feature_score REAL NOT NULL,
    value_score REAL NOT NULL,
    reasoning TEXT,
    model VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scores_product_id_idx ON scores(product_id);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    storage_key TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    format VARCHAR(32) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS videos_product_id_idx ON videos(product_id);
CREATE INDEX IF NOT EXISTS videos_status_idx ON videos(status);

-- Publications
CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id),
    platform VARCHAR(32) NOT NULL,
    external_id TEXT,
    external_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS publications_video_id_idx ON publications(video_id);
CREATE INDEX IF NOT EXISTS publications_status_idx ON publications(status);

-- Discovery Runs
CREATE TABLE IF NOT EXISTS discovery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(64) NOT NULL,
    products_found INTEGER NOT NULL DEFAULT 0,
    products_new INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'running',
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS discovery_runs_status_idx ON discovery_runs(status);
CREATE INDEX IF NOT EXISTS discovery_runs_source_idx ON discovery_runs(source);
