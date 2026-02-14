// Product statuses
export const PRODUCT_STATUSES = [
  "discovered", "processing", "processed", "summarized", "scored", "video_ready", "published"
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

// Video statuses
export const VIDEO_STATUSES = [
  "pending", "rendering", "rendered", "approved", "publishing", "published", "rejected"
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

// Publication statuses
export const PUBLICATION_STATUSES = [
  "pending", "uploading", "published", "failed"
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

// Video formats
export const VIDEO_FORMATS = ["youtube_long", "tiktok_short", "instagram_reel"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

// Platforms
export const PLATFORMS = ["youtube", "tiktok", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

// Screenshot types
export const SCREENSHOT_TYPES = ["hero", "pricing", "features", "dashboard"] as const;
export type ScreenshotType = (typeof SCREENSHOT_TYPES)[number];

// User agent for HTTP requests
export const USER_AGENT = "AgenticReviewer/1.0 (https://github.com/agenticreviewer)";

// Discovery sources
export const DISCOVERY_SOURCES = ["producthunt", "g2", "capterra", "hackernews", "reddit"] as const;
export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];

// Scoring dimensions
export interface ProductScore {
  overall: number;
  ux: number;
  performance: number;
  features: number;
  value: number;
  reasoning: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Result type
export { ok, err, type Result } from "./result.js";

// Logger
export { createLogger, type Logger } from "./logger.js";

// Rate limiting
export { createRateLimiter, type RateLimiter, type RateLimiterOptions, type RedisLike } from "./rate-limit.js";
