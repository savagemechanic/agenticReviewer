import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { renderVideo } from "./render.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

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

const port = Number(process.env.PORT ?? 3002);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Video renderer running on port ${port}`);
});
