-- Schema migration for both SQLite and Postgres.
-- SQLite: UUIDs stored as TEXT, timestamps as TEXT (RFC3339), JSON as TEXT.
-- Postgres: UUIDs as UUID, timestamps as TIMESTAMPTZ, JSON as JSONB.
-- This file uses the common subset that works for both.

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'discovered',
    metadata TEXT,
    discovered_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_source_idx ON products(source);

CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    url TEXT NOT NULL,
    page_url TEXT NOT NULL,
    type TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS screenshots_product_id_idx ON screenshots(product_id);

CREATE TABLE IF NOT EXISTS page_extractions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    page_url TEXT NOT NULL,
    title TEXT,
    headings TEXT,
    body_text TEXT,
    load_time_ms INTEGER,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS page_extractions_product_id_idx ON page_extractions(product_id);

CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE REFERENCES products(id),
    content TEXT NOT NULL,
    target_audience TEXT,
    key_features TEXT,
    pros TEXT,
    cons TEXT,
    model TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS summaries_product_id_idx ON summaries(product_id);

CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE REFERENCES products(id),
    overall REAL NOT NULL,
    ux_score REAL NOT NULL,
    performance_score REAL NOT NULL,
    feature_score REAL NOT NULL,
    value_score REAL NOT NULL,
    reasoning TEXT,
    model TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_product_id_idx ON scores(product_id);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    storage_key TEXT,
    duration_sec INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    format TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS videos_product_id_idx ON videos(product_id);
CREATE INDEX IF NOT EXISTS videos_status_idx ON videos(status);

CREATE TABLE IF NOT EXISTS publications (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos(id),
    platform TEXT NOT NULL,
    external_id TEXT,
    external_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS publications_video_id_idx ON publications(video_id);
CREATE INDEX IF NOT EXISTS publications_status_idx ON publications(status);

CREATE TABLE IF NOT EXISTS discovery_runs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    products_found INTEGER NOT NULL DEFAULT 0,
    products_new INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    error TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS discovery_runs_status_idx ON discovery_runs(status);
CREATE INDEX IF NOT EXISTS discovery_runs_source_idx ON discovery_runs(source);
