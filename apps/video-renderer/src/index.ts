import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { createLogger } from "@repo/shared";
import { renderVideo } from "./render.js";
import { env } from "./env.js";

const logger = createLogger("video-renderer");

const app = new Hono();
const startTime = Date.now();

app.get("/health", (c) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  return c.json({
    status: "ok",
    uptime,
  });
});

const renderSchema = z.object({
  videoId: z.string().uuid(),
  productId: z.string().uuid(),
  format: z.enum(["youtube_long", "tiktok_short", "instagram_reel"]).default("youtube_long"),
});

app.post("/render", async (c) => {
  const body = renderSchema.parse(await c.req.json());

  try {
    const result = await renderVideo(body);
    return c.json(result);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

serve({ fetch: app.fetch, port: env.PORT }, () => {
  logger.info("Video renderer started", { port: env.PORT });
});
