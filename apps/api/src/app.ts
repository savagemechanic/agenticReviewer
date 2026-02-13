import { Hono } from "hono";
import { cors } from "hono/cors";
import { discover } from "./routes/discover.js";
import { process as processRoute } from "./routes/process.js";
import { summarize } from "./routes/summarize.js";
import { score } from "./routes/score.js";
import { videoRender } from "./routes/video.js";
import { distribute } from "./routes/distribute.js";
import { products } from "./routes/products.js";
import { stats } from "./routes/stats.js";
import { videosRoute } from "./routes/videos.js";
import { createLogger } from "@repo/shared/logger";
import { db } from "./db.js";
import { env } from "./env.js";

const logger = createLogger("api");
const startTime = Date.now();

const app = new Hono();

// Security headers middleware
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  c.set("requestId" as never, requestId);
  c.header("X-Request-ID", requestId);

  await next();

  logger.info("request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: Date.now() - start,
    requestId,
  });
});

// CORS with specific origin from env
const allowedOrigin = env.CORS_ORIGIN || "*";
app.use("*", cors({
  origin: allowedOrigin,
  credentials: allowedOrigin !== "*",
}));

app.get("/health", async (c) => {
  let dbStatus = "ok";
  try {
    // Simple query to check DB connectivity
    await db.execute("SELECT 1");
  } catch (error) {
    dbStatus = "error";
    logger.error("Health check DB error", { error });
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return c.json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    db: dbStatus,
    uptime,
  });
});

app.route("/discover", discover);
app.route("/process", processRoute);
app.route("/summarize", summarize);
app.route("/score", score);
app.route("/video", videoRender);
app.route("/distribute", distribute);
app.route("/products", products);
app.route("/stats", stats);
app.route("/videos", videosRoute);

export { app };
