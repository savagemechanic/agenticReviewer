export declare const PRODUCT_STATUSES: readonly ["discovered", "processing", "processed", "summarized", "scored", "video_ready", "published"];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export declare const VIDEO_STATUSES: readonly ["pending", "rendering", "rendered", "approved", "publishing", "published", "rejected"];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];
export declare const PUBLICATION_STATUSES: readonly ["pending", "uploading", "published", "failed"];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export declare const VIDEO_FORMATS: readonly ["youtube_long", "tiktok_short", "instagram_reel"];
export type VideoFormat = (typeof VIDEO_FORMATS)[number];
export declare const PLATFORMS: readonly ["youtube", "tiktok", "instagram"];
export type Platform = (typeof PLATFORMS)[number];
export declare const SCREENSHOT_TYPES: readonly ["hero", "pricing", "features", "dashboard"];
export type ScreenshotType = (typeof SCREENSHOT_TYPES)[number];
export declare const DISCOVERY_SOURCES: readonly ["producthunt", "g2", "capterra", "hackernews", "reddit"];
export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];
export interface ProductScore {
    overall: number;
    ux: number;
    performance: number;
    features: number;
    value: number;
    reasoning: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map