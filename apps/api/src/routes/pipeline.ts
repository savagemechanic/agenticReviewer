import { Hono } from "hono";
import { z } from "zod";
import { eq, inArray } from "@repo/db";
import { db } from "../db.js";
import { products, pageExtractions, screenshots, summaries, scores, videos } from "@repo/db/schema";
import { takeScreenshot, extractPageData, measureTiming } from "@repo/browser";
import { summarizeProduct, scoreProduct } from "@repo/llm";
import { storage } from "../storage.js";
import { env } from "../env.js";
import { createLogger, type ScreenshotType } from "@repo/shared";

const logger = createLogger("api:pipeline");

const PAGES_TO_CAPTURE: { type: ScreenshotType; suffix: string }[] = [
  { type: "hero", suffix: "" },
  { type: "pricing", suffix: "/pricing" },
  { type: "features", suffix: "/features" },
];

interface StageResult {
  productId: string;
  productName: string;
  stage: string;
  status: "success" | "skipped" | "failed";
  error?: string;
}

async function processProduct(productId: string): Promise<StageResult> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) return { productId, productName: "unknown", stage: "process", status: "failed", error: "Not found" };

  await db.update(products).set({ status: "processing", updatedAt: new Date() }).where(eq(products.id, productId));

  try {
    const baseUrl = product.url.replace(/\/+$/, "");

    for (const page of PAGES_TO_CAPTURE) {
      const pageUrl = `${baseUrl}${page.suffix}`;
      try {
        const shot = await takeScreenshot(pageUrl);
        const key = `screenshots/${product.id}/${page.type}.png`;
        const url = await storage.upload(key, shot.buffer, "image/png");
        await db.insert(screenshots).values({
          productId: product.id,
          url,
          pageUrl,
          type: page.type,
          width: shot.width,
          height: shot.height,
        });
      } catch (err) {
        logger.warn("Failed to capture page", { type: page.type, url: pageUrl, error: String(err) });
      }
    }

    const extraction = await extractPageData(baseUrl);
    await db.insert(pageExtractions).values({
      productId: product.id,
      pageUrl: baseUrl,
      title: extraction.title,
      headings: extraction.headings,
      bodyText: extraction.bodyText,
      loadTimeMs: extraction.loadTimeMs,
    });

    const timing = await measureTiming(baseUrl);
    await db.insert(pageExtractions).values({
      productId: product.id,
      pageUrl: baseUrl,
      title: "__timing__",
      headings: [],
      bodyText: JSON.stringify(timing),
      loadTimeMs: timing.load,
    });

    await db.update(products).set({ status: "processed", updatedAt: new Date() }).where(eq(products.id, productId));
    return { productId, productName: product.name, stage: "process", status: "success" };
  } catch (error) {
    await db.update(products).set({ status: "discovered", updatedAt: new Date() }).where(eq(products.id, productId));
    return { productId, productName: product.name, stage: "process", status: "failed", error: String(error) };
  }
}

async function summarizeProductById(productId: string): Promise<StageResult> {
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) return { productId, productName: "unknown", stage: "summarize", status: "failed", error: "Not found" };

  const existing = await db.query.summaries.findFirst({ where: eq(summaries.productId, productId) });
  if (existing) return { productId, productName: product.name, stage: "summarize", status: "skipped" };

  const extraction = await db.query.pageExtractions.findFirst({ where: eq(pageExtractions.productId, productId) });
  if (!extraction) return { productId, productName: product.name, stage: "summarize", status: "failed", error: "No extraction" };

  const result = await summarizeProduct({
    productName: product.name,
    productUrl: product.url,
    pageTitle: extraction.title ?? "",
    headings: (extraction.headings as string[]) ?? [],
    bodyText: extraction.bodyText ?? "",
    loadTimeMs: extraction.loadTimeMs ?? 0,
  });

  if (!result.ok) return { productId, productName: product.name, stage: "summarize", status: "failed", error: result.error };

  await db.insert(summaries).values({
    productId,
    content: result.value.content,
    targetAudience: result.value.targetAudience,
    keyFeatures: result.value.keyFeatures,
    pros: result.value.pros,
    cons: result.value.cons,
    model: result.value.model,
  });

  await db.update(products).set({ status: "summarized", updatedAt: new Date() }).where(eq(products.id, productId));
  return { productId, productName: product.name, stage: "summarize", status: "success" };
}

async function scoreProductById(productId: string): Promise<StageResult> {
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) return { productId, productName: "unknown", stage: "score", status: "failed", error: "Not found" };

  const existing = await db.query.scores.findFirst({ where: eq(scores.productId, productId) });
  if (existing) return { productId, productName: product.name, stage: "score", status: "skipped" };

  const summary = await db.query.summaries.findFirst({ where: eq(summaries.productId, productId) });
  if (!summary) return { productId, productName: product.name, stage: "score", status: "failed", error: "No summary" };

  const extraction = await db.query.pageExtractions.findFirst({ where: eq(pageExtractions.productId, productId) });

  const result = await scoreProduct({
    productName: product.name,
    summary: summary.content,
    keyFeatures: (summary.keyFeatures as string[]) ?? [],
    pros: (summary.pros as string[]) ?? [],
    cons: (summary.cons as string[]) ?? [],
    loadTimeMs: extraction?.loadTimeMs ?? 0,
  });

  if (!result.ok) return { productId, productName: product.name, stage: "score", status: "failed", error: result.error };

  await db.insert(scores).values({
    productId,
    overall: result.value.overall,
    uxScore: result.value.uxScore,
    performanceScore: result.value.performanceScore,
    featureScore: result.value.featureScore,
    valueScore: result.value.valueScore,
    reasoning: result.value.reasoning,
    model: result.value.model,
  });

  await db.update(products).set({ status: "scored", updatedAt: new Date() }).where(eq(products.id, productId));
  return { productId, productName: product.name, stage: "score", status: "success" };
}

const videoRendererResponseSchema = z.object({
  storageKey: z.string(),
  durationSec: z.number(),
});

async function renderProductVideo(productId: string): Promise<StageResult> {
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) return { productId, productName: "unknown", stage: "render", status: "failed", error: "Not found" };

  const existingVideo = await db.query.videos.findFirst({ where: eq(videos.productId, productId) });
  if (existingVideo) return { productId, productName: product.name, stage: "render", status: "skipped" };

  const [video] = await db
    .insert(videos)
    .values({
      productId: product.id,
      storageKey: "",
      durationSec: 0,
      status: "rendering",
      format: "youtube_long",
    })
    .returning();

  try {
    const response = await fetch(`${env.VIDEO_RENDERER_URL}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id, productId: product.id, format: "youtube_long" }),
    });

    if (!response.ok) {
      await db.update(videos).set({ status: "rejected", updatedAt: new Date() }).where(eq(videos.id, video.id));
      return { productId, productName: product.name, stage: "render", status: "failed", error: `Renderer returned ${response.status}` };
    }

    const json: unknown = await response.json();
    const parsed = videoRendererResponseSchema.safeParse(json);
    if (!parsed.success) {
      await db.update(videos).set({ status: "rejected", updatedAt: new Date() }).where(eq(videos.id, video.id));
      return { productId, productName: product.name, stage: "render", status: "failed", error: "Invalid renderer response" };
    }

    await db
      .update(videos)
      .set({ storageKey: parsed.data.storageKey, durationSec: parsed.data.durationSec, status: "rendered", updatedAt: new Date() })
      .where(eq(videos.id, video.id));

    await db.update(products).set({ status: "video_ready", updatedAt: new Date() }).where(eq(products.id, productId));
    return { productId, productName: product.name, stage: "render", status: "success" };
  } catch (error) {
    await db.update(videos).set({ status: "rejected", updatedAt: new Date() }).where(eq(videos.id, video.id));
    return { productId, productName: product.name, stage: "render", status: "failed", error: String(error) };
  }
}

export const pipeline = new Hono();

pipeline.post("/process-all", async (c) => {
  const pending = await db.query.products.findMany({
    where: inArray(products.status, ["discovered", "processed", "summarized", "scored"]),
  });

  if (pending.length === 0) {
    return c.json({ success: true, data: { message: "No products to process", results: [] } });
  }

  logger.info("Starting process-all pipeline", { productCount: pending.length });

  const results: StageResult[] = [];

  for (const product of pending) {
    // Process (discovered → processed)
    if (product.status === "discovered") {
      const processResult = await processProduct(product.id);
      results.push(processResult);
      if (processResult.status === "failed") continue;
    }

    // Summarize (processed → summarized)
    if (product.status === "discovered" || product.status === "processed") {
      const summarizeResult = await summarizeProductById(product.id);
      results.push(summarizeResult);
      if (summarizeResult.status === "failed") continue;
    }

    // Score (summarized → scored)
    if (product.status === "discovered" || product.status === "processed" || product.status === "summarized") {
      const scoreResult = await scoreProductById(product.id);
      results.push(scoreResult);
      if (scoreResult.status === "failed") continue;
    }

    // Render (scored → video_ready)
    const renderResult = await renderProductVideo(product.id);
    results.push(renderResult);
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  logger.info("Process-all pipeline complete", { succeeded, failed, skipped });

  return c.json({
    success: true,
    data: {
      stats: { total: pending.length, succeeded, failed, skipped },
      results,
    },
  });
});
