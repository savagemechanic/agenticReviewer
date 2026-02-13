import fs from "fs";
import os from "os";
import path from "path";
import { renderMedia } from "@remotion/renderer";
import { createDb } from "@repo/db";
import { products, summaries, scores, screenshots } from "@repo/db/schema";
import { createStorageClient } from "@repo/storage";
import { eq } from "@repo/db";
import { getBundle } from "./bundle.js";
import { renderThumbnail } from "./thumbnail.js";
import type { ReviewVideoProps } from "./compositions/ReviewVideo.js";

const db = createDb(
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/agentic_reviewer"
);
const storage = createStorageClient({
  endpoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: Number(process.env.MINIO_PORT ?? 9000),
  accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  bucket: process.env.MINIO_BUCKET ?? "agentic-reviewer",
});

interface RenderInput {
  videoId: string;
  productId: string;
  format: string;
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
    keyFeatures: (summary.keyFeatures as string[]) ?? [],
    pros: (summary.pros as string[]) ?? [],
    cons: (summary.cons as string[]) ?? [],
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
        defaultProps: inputProps as any,
        props: inputProps as any,
        defaultCodec: "h264",
      } as any,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: inputProps as any,
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
    } catch (err) {
      console.warn("Thumbnail generation failed:", err);
    }

    return { storageKey, durationSec, thumbnailKey };
  } finally {
    // Clean up temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
