import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  integer,
  real,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Products ────────────────────────────────────────────────────────────────
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 512 }).notNull(),
    url: text("url").notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 })
      .notNull()
      .default("discovered"),
    metadata: jsonb("metadata"),
    discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_source_idx").on(t.source),
  ],
);

// ── Screenshots ─────────────────────────────────────────────────────────────
export const screenshots = pgTable(
  "screenshots",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    url: text("url").notNull(),
    pageUrl: text("page_url").notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("screenshots_product_id_idx").on(t.productId),
  ],
);

// ── Page Extractions ────────────────────────────────────────────────────────
export const pageExtractions = pgTable(
  "page_extractions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    pageUrl: text("page_url").notNull(),
    title: text("title"),
    headings: jsonb("headings"),
    bodyText: text("body_text"),
    loadTimeMs: integer("load_time_ms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("page_extractions_product_id_idx").on(t.productId),
  ],
);

// ── Summaries ───────────────────────────────────────────────────────────────
export const summaries = pgTable(
  "summaries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .unique()
      .references(() => products.id),
    content: text("content").notNull(),
    targetAudience: text("target_audience"),
    keyFeatures: jsonb("key_features"),
    pros: jsonb("pros"),
    cons: jsonb("cons"),
    model: varchar("model", { length: 128 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("summaries_product_id_idx").on(t.productId),
  ],
);

// ── Scores ──────────────────────────────────────────────────────────────────
export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .unique()
      .references(() => products.id),
    overall: real("overall").notNull(),
    uxScore: real("ux_score").notNull(),
    performanceScore: real("performance_score").notNull(),
    featureScore: real("feature_score").notNull(),
    valueScore: real("value_score").notNull(),
    reasoning: text("reasoning"),
    model: varchar("model", { length: 128 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("scores_product_id_idx").on(t.productId),
  ],
);

// ── Videos ──────────────────────────────────────────────────────────────────
export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    storageKey: text("storage_key").notNull(),
    durationSec: integer("duration_sec").notNull(),
    status: varchar("status", { length: 32 })
      .notNull()
      .default("pending"),
    format: varchar("format", { length: 32 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("videos_product_id_idx").on(t.productId),
    index("videos_status_idx").on(t.status),
  ],
);

// ── Publications ────────────────────────────────────────────────────────────
export const publications = pgTable(
  "publications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id),
    platform: varchar("platform", { length: 32 }).notNull(),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    status: varchar("status", { length: 32 })
      .notNull()
      .default("pending"),
    error: text("error"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("publications_video_id_idx").on(t.videoId),
    index("publications_status_idx").on(t.status),
  ],
);

// ── Discovery Runs ──────────────────────────────────────────────────────────
export const discoveryRuns = pgTable(
  "discovery_runs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    source: varchar("source", { length: 64 }).notNull(),
    productsFound: integer("products_found").notNull().default(0),
    productsNew: integer("products_new").notNull().default(0),
    status: varchar("status", { length: 32 })
      .notNull()
      .default("running"),
    error: text("error"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("discovery_runs_status_idx").on(t.status),
    index("discovery_runs_source_idx").on(t.source),
  ],
);
