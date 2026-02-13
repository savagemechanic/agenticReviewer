import { createDb } from "@repo/db";
import { products, summaries, scores, screenshots } from "@repo/db/schema";
import { createStorageClient } from "@repo/storage";
import { eq } from "@repo/db";

const db = createDb(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/agentic_reviewer");
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

export async function renderVideo(input: RenderInput): Promise<{ storageKey: string; durationSec: number }> {
  // Fetch product data for the composition
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

  // TODO: Replace with actual Remotion bundle + renderMedia
  // For now, create a placeholder
  const durationSec = input.format === "youtube_long" ? 120 : 60;
  const storageKey = `videos/${input.productId}/${input.videoId}.mp4`;

  // Placeholder — in production this would be the rendered video buffer
  const placeholder = Buffer.from("placeholder-video-content");
  await storage.upload(storageKey, placeholder, "video/mp4");

  return { storageKey, durationSec };
}
