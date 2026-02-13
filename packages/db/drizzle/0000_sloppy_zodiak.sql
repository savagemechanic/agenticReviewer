CREATE TABLE "discovery_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(64) NOT NULL,
	"products_found" integer DEFAULT 0 NOT NULL,
	"products_new" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "page_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"page_url" text NOT NULL,
	"title" text,
	"headings" jsonb,
	"body_text" text,
	"load_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(512) NOT NULL,
	"url" text NOT NULL,
	"source" varchar(64) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'discovered' NOT NULL,
	"metadata" jsonb,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"platform" varchar(32) NOT NULL,
	"external_id" text,
	"external_url" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"error" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"overall" real NOT NULL,
	"ux_score" real NOT NULL,
	"performance_score" real NOT NULL,
	"feature_score" real NOT NULL,
	"value_score" real NOT NULL,
	"reasoning" text,
	"model" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scores_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"page_url" text NOT NULL,
	"type" varchar(32) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"content" text NOT NULL,
	"target_audience" text,
	"key_features" jsonb,
	"pros" jsonb,
	"cons" jsonb,
	"model" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "summaries_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"format" varchar(32) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_extractions" ADD CONSTRAINT "page_extractions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_runs_status_idx" ON "discovery_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discovery_runs_source_idx" ON "discovery_runs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "page_extractions_product_id_idx" ON "page_extractions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_source_idx" ON "products" USING btree ("source");--> statement-breakpoint
CREATE INDEX "publications_video_id_idx" ON "publications" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "publications_status_idx" ON "publications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scores_product_id_idx" ON "scores" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "screenshots_product_id_idx" ON "screenshots" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "summaries_product_id_idx" ON "summaries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "videos_product_id_idx" ON "videos" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");