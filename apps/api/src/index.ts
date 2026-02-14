import { serve } from "@hono/node-server";
import { createLogger } from "@repo/shared";
import { app } from "./app.js";
import { env } from "./env.js";

const logger = createLogger("api");

serve({ fetch: app.fetch, port: env.PORT }, () => {
  logger.info("API server started", { port: env.PORT });
});
