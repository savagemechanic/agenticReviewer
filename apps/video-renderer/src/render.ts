import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";
import { renderMedia } from "@remotion/renderer";
import { createDb } from "@repo/db";
import { products, summaries, scores, screenshots } from "@repo/db/schema";
import { createStorageClient } from "@repo/storage";
import { eq } from "@repo/db";
import { createLogger } from "@repo/shared";
import { getBundle } from "./bundle.js";
import { renderThumbnail } from "./thumbnail.js";
import { env } from "./env.js";
import type { ReviewVideoProps } from "./compositions/ReviewVideo.js";

const logger = createLogger("video-renderer:render");

const db = createDb(env.DATABASE_URL);
const storage = createStorageClient({
  endpoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  bucket: env.MINIO_BUCKET,
});

interface RenderInput {
  videoId: string;
  productId: string;
  format: string;
}

const stringArraySchema = z.array(z.string());

function parseStringArray(value: unknown): string[] {
  const result = stringArraySchema.safeParse(value);
  return result.success ? result.data : [];
}

export async function renderVideo(
  input: RenderInput
): Promise<{ storageKey: string; durationSec: number; thumbnailKey?: string }> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, input.productId),
  });
  const summary = await db.query.summaries.findFirst({
    where: eq(summaries.productId, input.productId),
  });
  const score = await db.query.scores.findFirst({
    where: eq(scores.productId, input.productId),
  });
  const productScreenshots = await db.query.screenshots.findMany({
    where: eq(screenshots.productId, input.productId),
  });

  if (!product || !summary || !score) {
    throw new Error("Missing product data for video render");
  }

  const heroScreenshot = productScreenshots.find((s) => s.type === "hero");
  const isShort = input.format !== "youtube_long";
  const compositionId = isShort ? "ReviewVideoShort" : "ReviewVideo";
  const width = isShort ? 1080 : 1920;
  const height = isShort ? 1920 : 1080;
  const durationFrames = isShort ? 300 : 570;
  const fps = 30;
  const durationSec = Math.round(durationFrames / fps);

  const inputProps: ReviewVideoProps = {
    productName: product.name,
    summary: summary.content,
    keyFeatures: parseStringArray(summary.keyFeatures),
    pros: parseStringArray(summary.pros),
    cons: parseStringArray(summary.cons),
    overallScore: score.overall,
    uxScore: score.uxScore,
    performanceScore: score.performanceScore,
    featureScore: score.featureScore,
    valueScore: score.valueScore,
    screenshotUrl: heroScreenshot?.url,
    format: input.format as ReviewVideoProps["format"],
  };

  const bundleLocation = await getBundle();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "remotion-"));
  const outputPath = path.join(tmpDir, `${input.videoId}.mp4`);

  try {
    await renderMedia({
      composition: {
        id: compositionId,
        durationInFrames: durationFrames,
        fps,
        width,
        height,
        // SAFETY: Remotion's renderMedia types expect Record<string, unknown> for props,
        // but our ReviewVideoProps is a concrete interface. The runtime accepts it correctly.
        defaultProps: inputProps as unknown as Record<string, unknown>,
        props: inputProps as unknown as Record<string, unknown>,
        defaultCodec: "h264",
      // SAFETY: Remotion's CompositionConfig type doesn't include all fields we pass,
      // but the renderer accepts this shape at runtime.
      } as Parameters<typeof renderMedia>[0]["composition"],
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: inputProps as unknown as Record<string, unknown>,
    });

    // Upload video to MinIO
    const videoBuffer = fs.readFileSync(outputPath);
    const storageKey = `videos/${input.productId}/${input.videoId}.mp4`;
    await storage.upload(storageKey, videoBuffer, "video/mp4");

    // Generate and upload thumbnail
    let thumbnailKey: string | undefined;
    try {
      const thumbnailBuffer = await renderThumbnail(inputProps);
      thumbnailKey = `thumbnails/${input.productId}/${input.videoId}.png`;
      await storage.upload(thumbnailKey, thumbnailBuffer, "image/png");
    } catch (error: unknown) {
      logger.warn("Thumbnail generation failed", { error: String(error) });
    }

    return { storageKey, durationSec, thumbnailKey };
  } finally {
    // Clean up temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
