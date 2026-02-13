import type { VideoFormat } from "./index.js";

export interface FormatConfig {
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  introDuration: number;
  screenshotDuration: number;
  summaryDuration: number;
  scoreDuration: number;
  outroDuration: number;
}

export const FORMAT_CONFIGS: Record<VideoFormat, FormatConfig> = {
  youtube_long: {
    width: 1920,
    height: 1080,
    fps: 30,
    durationFrames: 570,
    introDuration: 90,
    screenshotDuration: 120,
    summaryDuration: 150,
    scoreDuration: 120,
    outroDuration: 90,
  },
  tiktok_short: {
    width: 1080,
    height: 1920,
    fps: 30,
    durationFrames: 300,
    introDuration: 45,
    screenshotDuration: 60,
    summaryDuration: 90,
    scoreDuration: 60,
    outroDuration: 45,
  },
  instagram_reel: {
    width: 1080,
    height: 1920,
    fps: 30,
    durationFrames: 300,
    introDuration: 45,
    screenshotDuration: 60,
    summaryDuration: 90,
    scoreDuration: 60,
    outroDuration: 45,
  },
};
